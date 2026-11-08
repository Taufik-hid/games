import { getSupabaseAdmin } from "@/lib/supabase-server";

/**
 * Mesin skor: append-only ledger, idempotent, batas 100/game & 600 total.
 * Semua perhitungan poin di server. Client tidak pernah mengirim skor.
 */
export const MAX_PER_GAME = 100;

export type AwardResult = {
  ok: boolean;
  pointsAwarded: number;
  duplicate: boolean;
  gameTotal: number;
};

/** Beri poin untuk satu item game. Idempotent per (room, game, item). */
export async function awardPoints(opts: {
  roomId: string;
  gameId: string;
  itemId: string;
  points: number;
  reason: string;
}): Promise<AwardResult> {
  const db = getSupabaseAdmin();
  const clamped = Math.max(0, Math.min(MAX_PER_GAME, Math.round(opts.points)));

  // idempotensi via UNIQUE(room_id, game_id, item_id)
  const { error } = await db.from("points_ledger").insert({
    room_id: opts.roomId,
    game_id: opts.gameId,
    item_id: opts.itemId,
    points: clamped,
    reason: opts.reason,
  });
  if (error) {
    if (error.code === "23505") {
      // sudah pernah diberi — kembalikan total lama tanpa menambah
      const total = await getGameTotal(opts.roomId, opts.gameId);
      return { ok: true, pointsAwarded: 0, duplicate: true, gameTotal: total };
    }
    throw error;
  }
  const total = await getGameTotal(opts.roomId, opts.gameId);
  return { ok: true, pointsAwarded: clamped, duplicate: false, gameTotal: total };
}

export async function getGameTotal(roomId: string, gameId: string): Promise<number> {
  const { data } = await getSupabaseAdmin()
    .from("points_ledger")
    .select("points")
    .eq("room_id", roomId)
    .eq("game_id", gameId);
  return (data ?? []).reduce((a, r) => a + r.points, 0);
}

/** Skor Love Quiz: round(100 × benar / total) */
export function quizScore(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((100 * correct) / total);
}

/** Skor Escape Room per level: 20 - 5×hint (min 0) */
export function escapeLevelScore(hintsUsed: number): number {
  return Math.max(0, 20 - 5 * Math.max(0, hintsUsed));
}

/** Skor Memory Lane per foto: percobaan1=20, percobaan2=10, lainnya 0 */
export function memoryLaneScore(attempt: number): number {
  if (attempt <= 1) return 20;
  if (attempt === 2) return 10;
  return 0;
}

/** Skor Mystery Box: kotak 1-8 = 11, kotak 9 = 12 (total 100) */
export function mysteryBoxScore(boxNumber: number): number {
  return boxNumber === 9 ? 12 : 11;
}

/** Skor Catch My Heart: min(100, round(raw × 100 / target)) */
export function catchHeartScore(rawScore: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((rawScore * 100) / target));
}
