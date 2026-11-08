import { describe, expect, it } from "vitest";
import { generateToken, hashToken, verifyPasscode, hashPasscode, generatePasscode } from "@/lib/auth";
import { createRoomSchema, joinRoomSchema, submitAnswerSchema } from "@/lib/validation";
import { rateLimit, resetRateLimits } from "@/lib/rate-limit";

describe("auth tokens", () => {
  it("token minimal 128 bit entropy & unik", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateToken()));
    expect(tokens.size).toBe(100);
    expect(generateToken().length).toBeGreaterThanOrEqual(22); // 32 bytes base64url
  });

  it("hash stabil dan bukan plaintext", () => {
    const t = generateToken();
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).not.toContain(t);
    expect(hashToken(t)).toHaveLength(64);
  });

  it("passcode verify benar/salah", () => {
    const p = generatePasscode();
    expect(p).toMatch(/^\d{6}$/);
    const h = hashPasscode(p);
    expect(verifyPasscode(p, h)).toBe(true);
    expect(verifyPasscode("000000", h)).toBe(false);
    expect(verifyPasscode(` ${p} `, h)).toBe(true);
  });
});

describe("validation schemas", () => {
  it("createRoom valid & tolak field ekstra", () => {
    const ok = createRoomSchema.safeParse({ displayName: "Host" });
    expect(ok.success).toBe(true);
    const extra = createRoomSchema.safeParse({ displayName: "H", admin: true });
    expect(extra.success).toBe(false);
  });

  it("joinRoom kode harus 6 karakter", () => {
    expect(joinRoomSchema.safeParse({ code: "ABC234", displayName: "P" }).success).toBe(true);
    expect(joinRoomSchema.safeParse({ code: "AB1", displayName: "P" }).success).toBe(false);
    expect(joinRoomSchema.safeParse({ code: "ABC23I", displayName: "P" }).success).toBe(true); // panjang 6 saja dicek
  });

  it("submitAnswer wajib idempotencyKey", () => {
    const base = { gameSlug: "love-quiz", itemId: "00000000-0000-0000-0000-000000000000" };
    expect(submitAnswerSchema.safeParse({ ...base, idempotencyKey: "abcd1234" }).success).toBe(true);
    expect(submitAnswerSchema.safeParse(base).success).toBe(false);
  });
});

describe("rate limit", () => {
  it("memblokir setelah limit", () => {
    resetRateLimits();
    for (let i = 0; i < 5; i++) expect(rateLimit("k1", 5, 60_000).ok).toBe(true);
    const blocked = rateLimit("k1", 5, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });
});
