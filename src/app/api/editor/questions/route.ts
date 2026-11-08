import { NextRequest } from "next/server";
import { getAuthMember, jsonError } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const questionSchema = z.object({
  id: z.string().uuid().optional(),
  gameSlug: z.string().max(40),
  order: z.number().int().min(1).max(50),
  prompt: z.string().min(1).max(1000),
  options: z.array(z.string().max(200)).max(6).optional(),
  answerKey: z.string().max(500).optional(),
  hints: z.array(z.string().max(300)).max(2).optional(),
  personalResponse: z.string().max(1000).optional(),
}).strict();

/** GET /api/editor/questions?gameSlug= — list soal (host only, termasuk answer_key). */
export async function GET(req: NextRequest) {
  const member = await getAuthMember();
  if (!member || member.role !== "host") return jsonError("Hanya host", 403);
  const gameSlug = new URL(req.url).searchParams.get("gameSlug");
  if (!gameSlug) return jsonError("gameSlug wajib", 400);

  const db = getSupabaseAdmin();
  const { data: room } = await db.from("rooms").select("content_set_id").eq("id", member.room_id).single();
  const { data: game } = await db.from("games").select("id, title, config").eq("content_set_id", room!.content_set_id).eq("slug", gameSlug).single();
  if (!game) return jsonError("Game tidak ditemukan", 404);

  const { data: items } = await db
    .from("questions")
    .select("id, type, \"order\", prompt, options, answer_key, hints, personal_response")
    .eq("game_id", game.id)
    .order("order");

  return Response.json({ ok: true, game: { slug: gameSlug, title: game.title, config: game.config }, items });
}

/** POST /api/editor/questions — upsert soal (host only). */
export async function POST(req: NextRequest) {
  const member = await getAuthMember();
  if (!member || member.role !== "host") return jsonError("Hanya host", 403);

  let body: unknown;
  try { body = await req.json(); } catch { return jsonError("Body tidak valid", 400); }
  const parsed = questionSchema.safeParse(body);
  if (!parsed.success) return jsonError("Data soal tidak valid", 400);
  const q = parsed.data;

  const db = getSupabaseAdmin();
  const { data: room } = await db.from("rooms").select("content_set_id").eq("id", member.room_id).single();
  const { data: game } = await db.from("games").select("id").eq("content_set_id", room!.content_set_id).eq("slug", q.gameSlug).single();
  if (!game) return jsonError("Game tidak ditemukan", 404);

  const row = {
    game_id: game.id,
    type: q.options?.length ? "multiple_choice" : "text",
    order: q.order,
    prompt: q.prompt,
    options: q.options ?? null,
    answer_key: q.answerKey ?? null,
    hints: q.hints ?? [],
    personal_response: q.personalResponse ?? null,
  };

  if (q.id) {
    const { error } = await db.from("questions").update(row).eq("id", q.id);
    if (error) return jsonError("Gagal memperbarui soal", 500);
    return Response.json({ ok: true, id: q.id });
  }
  const { data, error } = await db.from("questions").insert(row).select("id").single();
  if (error) return jsonError("Gagal menambah soal", 500);
  return Response.json({ ok: true, id: data!.id });
}

/** DELETE /api/editor/questions?id= */
export async function DELETE(req: NextRequest) {
  const member = await getAuthMember();
  if (!member || member.role !== "host") return jsonError("Hanya host", 403);
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return jsonError("id wajib", 400);
  const { error } = await getSupabaseAdmin().from("questions").delete().eq("id", id);
  if (error) return jsonError("Gagal menghapus soal", 500);
  return Response.json({ ok: true });
}
