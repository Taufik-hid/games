import { getSupabaseAdmin } from "@/lib/supabase-server";

/** Cek & buka reward berdasarkan game selesai. Dipanggil saat game_session ditandai completed. */
export async function unlockRewardsForCompletedGame(roomId: string, gameSlug: string) {
  const db = getSupabaseAdmin();
  const { data: room } = await db.from("rooms").select("content_set_id").eq("id", roomId).single();
  if (!room) return;
  const { data: rewards } = await db.from("rewards").select("id, slug, unlock_rule").eq("content_set_id", room.content_set_id);
  const matches = (rewards ?? []).filter((r) => r.unlock_rule === gameSlug);
  for (const r of matches) {
    await db.from("reward_unlocks").upsert({ room_id: roomId, reward_id: r.id }, { onConflict: "room_id, reward_id" });
  }
}

/** Daftar reward + status buka. Konten HANYA dikirim bila terbuka. */
export async function listRewards(roomId: string) {
  const db = getSupabaseAdmin();
  const { data: room } = await db.from("rooms").select("content_set_id").eq("id", roomId).single();
  if (!room) return [];
  const { data: rewards } = await db.from("rewards").select("id, slug, title, unlock_rule, body").eq("content_set_id", room.content_set_id);
  const { data: unlocks } = await db.from("reward_unlocks").select("reward_id, unlocked_at").eq("room_id", roomId);
  const unlockedIds = new Set((unlocks ?? []).map((u) => u.reward_id));
  return (rewards ?? []).map((r) => ({
    slug: r.slug,
    title: r.title,
    unlockRule: r.unlock_rule,
    unlocked: unlockedIds.has(r.id),
    // konten body hanya bila terbuka (server-side gating)
    body: unlockedIds.has(r.id) ? r.body : null,
  }));
}
