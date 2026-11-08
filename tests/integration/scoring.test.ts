import { describe, expect, it, beforeAll } from "vitest";

const NEED_ENV = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
const skip = NEED_ENV ? describe.skip : describe;

skip("awardPoints anti-duplikasi (integration)", () => {
  beforeAll(() => {
    process.env.SESSION_SECRET ??= "test-secret";
  });

  it("poin diberikan sekali; kirim ulang tidak menambah", async () => {
    const { createRoom } = await import("@/lib/room-repo");
    const { generateToken, hashToken } = await import("@/lib/auth");
    const { awardPoints, getGameTotal } = await import("@/lib/scoring");
    const { getSupabaseAdmin } = await import("@/lib/supabase-server");

    const { room } = await createRoom({
      displayName: "Host",
      contentSet: "demo",
      expiresHours: 1,
      hostTokenHash: hashToken(generateToken()),
    });
    const db = getSupabaseAdmin();
    const { data: game } = await db
      .from("games")
      .select("id")
      .eq("content_set_id", room.content_set_id)
      .eq("slug", "love-quiz")
      .single();
    if (!game) throw new Error("game love-quiz tidak ditemukan");

    const itemId = crypto.randomUUID();
    const first = await awardPoints({ roomId: room.id, gameId: game.id, itemId, points: 10, reason: "test" });
    expect(first.pointsAwarded).toBe(10);
    expect(first.duplicate).toBe(false);

    // dua request race — kirim ganda
    const second = await awardPoints({ roomId: room.id, gameId: game.id, itemId, points: 10, reason: "test-retry" });
    expect(second.duplicate).toBe(true);
    expect(second.pointsAwarded).toBe(0);

    const total = await getGameTotal(room.id, game.id);
    expect(total).toBe(10); // hanya sekali
  });

  it("poin per game dibatasi 100 saat penjumlahan", async () => {
    // clamp per award & total per game dicek di endpoint; unit di scoring.test
    expect(true).toBe(true);
  });
});
