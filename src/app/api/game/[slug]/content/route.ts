import { NextRequest } from "next/server";
import { getAuthMember, jsonError } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * GET /api/game/[slug]/content — konten game untuk player.
 * answer_key TIDAK PERNAH dikirim ke client.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const member = await getAuthMember();
  if (!member) return jsonError("Belum terautentikasi", 401);
  const { slug } = await ctx.params;

  const db = getSupabaseAdmin();
  const { data: room } = await db.from("rooms").select("*").eq("id", member.room_id).single();
  if (!room) return jsonError("Room tidak ditemukan", 404);
  if (room.status === "paused") return jsonError("Sesi dijeda host", 409);
  if (room.status !== "playing") return jsonError("Sesi belum berjalan", 409);

  const { data: game } = await db
    .from("games")
    .select("id, slug, title, config")
    .eq("content_set_id", room.content_set_id)
    .eq("slug", slug)
    .single();
  if (!game) return jsonError("Game tidak ditemukan", 404);

  const { data: session } = await db
    .from("game_sessions")
    .select("id, status")
    .eq("room_id", room.id)
    .eq("game_id", game.id)
    .single();
  if (!session || session.status === "locked") return jsonError("Game terkunci", 409);
  if (session.status === "completed") return jsonError("Game sudah selesai", 409);

  const { data: items } = await db
    .from("questions")
    .select("id, type, \"order\", prompt, options, hints, media_id, personal_response")
    .eq("game_id", game.id)
    .order("order");

  // hint hanya dikirim jika escape room (dipakai dengan penalti) — cukup level 1 dulu
  const hints = slug === "love-escape-room" ? (items ?? []).map((it) => ({ id: it.id, hints: it.hints ?? [] })) : undefined;

  return Response.json({
    ok: true,
    game: { slug: game.slug, title: game.title, config: game.config },
    session: { status: session.status },
    items: (items ?? []).map((it) => ({
      id: it.id,
      type: it.type,
      order: it.order,
      prompt: it.prompt,
      options: it.options,
      mediaId: it.media_id,
    })),
    hints,
  });
}
