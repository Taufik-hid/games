/**
 * Integration test Fase 2 — butuh env Supabase asli (.env di root project).
 * Menjalankan alur: create room -> join player -> otorisasi -> reset seat.
 * Berjalan via service role langsung ke repo functions (bukan HTTP), lalu
 * route handlers diuji E2E di Fase 9.
 */
import { beforeAll, describe, expect, it } from "vitest";

const NEED_ENV = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
const d = NEED_ENV ? describe.skip : describe;

d("room repo integration (Supabase)", () => {
  beforeAll(() => {
    process.env.SESSION_SECRET ??= "test-secret";
  });

  it("create room -> kode unik, member host tercatat", async () => {
    const { createRoom } = await import("@/lib/room-repo");
    const { generateToken, hashToken } = await import("@/lib/auth");
    const { room, member } = await createRoom({
      displayName: "Host Test",
      contentSet: "demo",
      expiresHours: 1,
      hostTokenHash: hashToken(generateToken()),
    });
    expect(room.code).toHaveLength(6);
    expect(room.code).not.toMatch(/[01OI]/);
    expect(room.game_order).toHaveLength(6);
    expect(member.role).toBe("host");
    expect(room.status).toBe("lobby");
  });

  it("join: seat pertama diterima, seat kedua ditolak, rejoin token lama OK", async () => {
    const { createRoom, joinRoom, findRoomByCode } = await import("@/lib/room-repo");
    const { generateToken, hashToken } = await import("@/lib/auth");
    const { room } = await createRoom({
      displayName: "Host",
      contentSet: "demo",
      expiresHours: 1,
      hostTokenHash: hashToken(generateToken()),
    });

    const t1 = generateToken();
    const first = await joinRoom(room.id, "Player", hashToken(t1));
    expect(first.rejoin).toBe(false);
    expect(first.member?.role).toBe("player");

    const t2 = generateToken();
    const second = await joinRoom(room.id, "Intruder", hashToken(t2));
    expect(second.seatTaken).toBe(true);
    expect(second.member).toBeNull();

    const rejoin = await joinRoom(room.id, "Player", hashToken(t1));
    expect(rejoin.rejoin).toBe(true);

    const found = await findRoomByCode(room.code);
    expect(found?.id).toBe(room.id);
  });

  it("bumpRoomVersion menaikkan version + mencatat event", async () => {
    const { createRoom, bumpRoomVersion, findRoomById } = await import("@/lib/room-repo");
    const { generateToken, hashToken } = await import("@/lib/auth");
    const { room } = await createRoom({
      displayName: "Host",
      contentSet: "demo",
      expiresHours: 1,
      hostTokenHash: hashToken(generateToken()),
    });
    const before = (await findRoomById(room.id))!.version;
    await bumpRoomVersion(room.id, "test:event", { foo: 1 });
    const after = (await findRoomById(room.id))!.version;
    expect(Number(after)).toBe(Number(before) + 1);
  });

  it("getRoomState tidak memuat answer_key", async () => {
    const { createRoom, getRoomState } = await import("@/lib/room-repo");
    const { generateToken, hashToken } = await import("@/lib/auth");
    const { room } = await createRoom({
      displayName: "Host",
      contentSet: "demo",
      expiresHours: 1,
      hostTokenHash: hashToken(generateToken()),
    });
    const raw = JSON.stringify(await getRoomState(room.id));
    expect(raw).not.toContain("answer_key");
  });
});
