import { NextRequest } from "next/server";
import { getAuthMember, jsonError } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { z } from "zod";
import { createHash } from "node:crypto";

export const dynamic = "force-dynamic";

const rewardSchema = z.object({
  slug: z.string().max(40),
  title: z.string().max(200).optional(),
  body: z.record(z.string(), z.unknown()).optional(),
}).strict();

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "audio/mpeg", "audio/wav", "audio/mp4", "video/mp4"];
const MAX_BYTES = Number(process.env.MAX_UPLOAD_MB ?? 10) * 1024 * 1024;

/** GET /api/editor/content — reward + final letter + kelengkapan (host only). */
export async function GET() {
  const member = await getAuthMember();
  if (!member || member.role !== "host") return jsonError("Hanya host", 403);
  const db = getSupabaseAdmin();
  const { data: room } = await db.from("rooms").select("content_set_id").eq("id", member.room_id).single();
  const { data: rewards } = await db.from("rewards").select("slug, title, body").eq("content_set_id", room!.content_set_id);

  // kelengkapan per game
  const { data: games } = await db.from("games").select("id, slug, title").eq("content_set_id", room!.content_set_id);
  const { data: counts } = await db
    .from("questions")
    .select("game_id, id")
    .in("game_id", (games ?? []).map((g) => g.id));
  const countByGame = new Map<string, number>();
  for (const c of counts ?? []) {
    countByGame.set(c.game_id, (countByGame.get(c.game_id) ?? 0) + 1);
  }
  const expected: Record<string, number> = {
    "love-quiz": 10, "love-escape-room": 5, "memory-lane": 5,
    "mystery-box": 9, "guess-the-song": 5, "catch-my-heart": 0,
  };
  const completeness = (games ?? []).map((g) => ({
    slug: g.slug,
    title: g.title,
    filled: countByGame.get(g.id) ?? 0,
    expected: expected[g.slug] ?? 0,
  }));

  return Response.json({ ok: true, rewards, completeness });
}

/** POST /api/editor/content — update reward / final letter (JSON), atau upload media multipart. */
export async function POST(req: NextRequest) {
  const member = await getAuthMember();
  if (!member || member.role !== "host") return jsonError("Hanya host", 403);
  const db = getSupabaseAdmin();
  const { data: room } = await db.from("rooms").select("content_set_id").eq("id", member.room_id).single();

  const contentType = req.headers.get("content-type") ?? "";

  // upload media
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return jsonError("file wajib", 400);
    if (!ALLOWED_MIME.includes(file.type)) return jsonError("Tipe file tidak diizinkan", 400);
    if (file.size > MAX_BYTES) return jsonError("File terlalu besar", 400);

    const ext = file.name.split(".").pop()?.slice(0, 5) ?? "bin";
    const path = `${room!.content_set_id}/${createHash("sha256").update(`${Date.now()}-${Math.random()}`).digest("hex").slice(0, 16)}.${ext}`;
    const { error } = await db.storage.from(process.env.STORAGE_BUCKET ?? "media").upload(path, file, { contentType: file.type });
    if (error) return jsonError(`Gagal upload: ${error.message}`, 500);
    return Response.json({ ok: true, path, mime: file.type, size: file.size });
  }

  // update reward JSON
  let body: unknown;
  try { body = await req.json(); } catch { return jsonError("Body tidak valid", 400); }
  const parsed = rewardSchema.safeParse(body);
  if (!parsed.success) return jsonError("Data reward tidak valid", 400);
  const { slug, title, body: rewardBody } = parsed.data;

  const update: Record<string, unknown> = {};
  if (title !== undefined) update.title = title;
  if (rewardBody !== undefined) update.body = rewardBody;
  const { error } = await db.from("rewards").update(update).eq("content_set_id", room!.content_set_id).eq("slug", slug);
  if (error) return jsonError("Gagal menyimpan reward", 500);
  return Response.json({ ok: true });
}
