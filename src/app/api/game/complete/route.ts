import { NextRequest } from "next/server";
import { getAuthMember, jsonError } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { unlockRewardsForCompletedGame } from "@/lib/rewards";

export const dynamic = "force-dynamic";

/** POST /api/game/complete — tandai game selesai (host atau auto saat alur game berakhir). Membuka reward terkait. */
export async function POST(req: NextRequest) {
  const member = await getAuthMember();
  if (!member) return jsonError("Belum terautentikasi", 401);

  let body: { gameSlug?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("Body tidak valid", 400);
  }
  const gameSlug = body.gameSlug;
  if (!gameSlug) return jsonError("gameSlug wajib", 400);

  const db = getSupabaseAdmin();
  const roomId = member.room_id;
  const { data: room } = await db.from("rooms").select("content_set_id, status").eq("id", roomId).single();
  if (!room) return jsonError("Room tidak ditemukan", 404);

  const { data: game } = await db.from("games").select("id").eq("content_set_id", room.content_set_id).eq("slug", gameSlug).single();
  if (!game) return jsonError("Game tidak ditemukan", 404);

  // hanya player boleh menyelesaikan gamenya sendiri; host juga boleh (koreksi manual)
  const { data: session } = await db.from("game_sessions").select("id, status").eq("room_id", roomId).eq("game_id", game.id).single();
  if (!session) return jsonError("Game belum tersedia", 409);
  if (session.status === "locked") return jsonError("Game masih terkunci", 409);

  if (session.status !== "completed") {
    const { data: ledger } = await db.from("points_ledger").select("points").eq("room_id", roomId).eq("game_id", game.id);
    const score = Math.min(100, (ledger ?? []).reduce((a, r) => a + r.points, 0));
    await db.from("game_sessions").update({ status: "completed", completed_at: new Date().toISOString(), score }).eq("id", session.id);
  }
  await unlockRewardsForCompletedGame(roomId, gameSlug);
  const { data: roomRow } = await db.from("rooms").select("version").eq("id", roomId).single();
  await db.from("rooms").update({ version: (roomRow?.version ?? 0) + 1 }).eq("id", roomId);

  // kalau semua 6 selesai → room finished
  const { data: sessions } = await db.from("game_sessions").select("status").eq("room_id", roomId);
  const allDone = (sessions ?? []).length >= 6 && (sessions ?? []).every((s) => s.status === "completed");
  if (allDone) await db.from("rooms").update({ status: "finished" }).eq("id", roomId);

  return Response.json({ ok: true, allDone });
}
