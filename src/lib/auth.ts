import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** Token CSPRNG minimal 128 bit (16 byte = 128 bit; kita pakai 32 byte). */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Verifikasi passcode pemulihan host dengan timing-safe compare. */
export function verifyPasscode(input: string, storedHash: string): boolean {
  const inputHash = hashToken(input.trim());
  const a = Buffer.from(inputHash, "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function hashPasscode(passcode: string): string {
  return hashToken(passcode.trim());
}

export function generatePasscode(): string {
  // 6 digit numerik, mudah dibaca ulang
  return String(100000 + (randomBytes(4).readUInt32BE(0) % 900000));
}

/** Cookie options untuk token room (httpOnly, Secure, SameSite=Lax). */
export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 48, // 48 jam, selaras expires_at room
  };
}
