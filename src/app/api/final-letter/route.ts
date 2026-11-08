import { NextRequest } from "next/server";
import { getAuthMember, jsonError } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/** GET /api/final-letter — konten surat final; 403 bila belum 6 game selesai. */
export async function GET(_req: NextRequest) {
  const member = await getAuthMember();
  if (!member) return jsonError("Belum terautentikasi", 401);
  const db = getSupabaseAdmin();
  const roomId = member.room_id;

  const { data: room } = await db.from("rooms").select("content_set_id, status").eq("id", roomId).single();
  if (!room) return jsonError("Room tidak ditemukan", 404);

  const { data: sessions } = await db.from("game_sessions").select("status, score, games(slug)").eq("room_id", roomId);
  const all = sessions ?? [];
  const completed = all.filter((s) => s.status === "completed").length;
  const allDone = all.length >= 6 && completed >= 6;

  if (!allDone) {
    return jsonError("Surat final masih terkunci — selesaikan keenam game dulu 💗", 403, { completed });
  }

  const { data: reward } = await db
    .from("rewards")
    .select("id, body")
    .eq("content_set_id", room.content_set_id)
    .eq("slug", "final-letter")
    .single();
  const { data: unlocked } = await db.from("reward_unlocks").select("id").eq("room_id", roomId).eq("reward_id", reward?.id ?? "").maybeSingle();

  const { data: ledger } = await db.from("points_ledger").select("points").eq("room_id", roomId);
  const total = Math.min(600, (ledger ?? []).reduce((a, r) => a + r.points, 0));

  return Response.json({
    ok: true,
    body: unlocked ? reward?.body : null,
    totalPoints: total,
    perGame: all.map((s) => ({ slug: (s.games as unknown as { slug: string })?.slug, score: s.score })),
  });
}
