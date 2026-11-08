import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createRoomSchema, joinRoomSchema } from "@/lib/validation";
import { generateToken, hashToken, hashPasscode, generatePasscode, cookieOptions } from "@/lib/auth";
import { createRoom, findRoomByCode, joinRoom } from "@/lib/room-repo";
import { rateLimit } from "@/lib/rate-limit";
import { jsonError, clientIp } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** POST /api/room — body: {mode:"create"|"join", ...} */
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Body tidak valid", 400);
  }

  const mode = (body as Record<string, unknown>)?.mode;
  const store = await cookies();

  if (mode === "create") {
    const rl = rateLimit(`create:${ip}`, 5, 60_000);
    if (!rl.ok) return jsonError("Terlalu banyak percobaan. Coba lagi nanti.", 429, { retryAfter: rl.retryAfterSec });
    const { mode: _mode, ...rest } = body as Record<string, unknown>;
  const parsed = createRoomSchema.safeParse(rest);

    if (!parsed.success) return jsonError("Data tidak valid", 400);

    const hostToken = generateToken();
    const passcode = parsed.data.passcode ?? generatePasscode();
    try {
      const { room, member } = await createRoom({
        displayName: parsed.data.displayName,
        contentSet: parsed.data.contentSet,
        expiresHours: parsed.data.expiresHours,
        hostTokenHash: hashToken(hostToken),
        passcodeHash: hashPasscode(passcode),
      });
      store.set("hda_token", hostToken, cookieOptions());
      return Response.json({ ok: true, role: "host", code: room.code, roomId: room.id, passcode, memberId: member.id });
    } catch (e) {
      console.error("createRoom failed:", (e as Error).message);
      return jsonError("Gagal membuat room", 500);
    }
  }

  if (mode === "join") {
    const rl = rateLimit(`join:${ip}`, 10, 60_000);
    if (!rl.ok) return jsonError("Terlalu banyak percobaan. Coba lagi nanti.", 429, { retryAfter: rl.retryAfterSec });
    const { mode: _mode2, ...rest2 } = body as Record<string, unknown>;
  const parsed = joinRoomSchema.safeParse(rest2);
    if (!parsed.success) return jsonError("Kode atau nama tidak valid", 400);

    const room = await findRoomByCode(parsed.data.code.toUpperCase());
    // pesan generik agar tidak membocorkan keberadaan kode
    const generic = () => jsonError("Kode room tidak valid atau sudah kedaluwarsa", 404);
    if (!room || new Date(room.expires_at) < new Date()) return generic();

    const playerToken = generateToken();
    const result = await joinRoom(room.id, parsed.data.displayName, hashToken(playerToken));
    if (result.seatTaken) return jsonError("Seat player sudah terisi. Minta host reset seat bila ini kamu.", 409);
    if (!result.member) return jsonError("Gagal join room", 500);

    store.set("hda_token", playerToken, cookieOptions());
    return Response.json({ ok: true, role: "player", code: room.code, roomId: room.id, memberId: result.member.id, rejoin: result.rejoin });
  }

  return jsonError("mode harus create atau join", 400);
}
