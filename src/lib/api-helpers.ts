import { cookies } from "next/headers";
import { getMemberByTokenHash } from "@/lib/room-repo";

export async function getAuthMember() {
  const store = await cookies();
  const token = store.get("hda_token")?.value;
  if (!token) return null;
  const { hashToken } = await import("@/lib/auth");
  return getMemberByTokenHash(hashToken(token));
}

export function jsonError(message: string, status: number, extra: Record<string, unknown> = {}) {
  return Response.json({ error: message, ...extra }, { status });
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}
