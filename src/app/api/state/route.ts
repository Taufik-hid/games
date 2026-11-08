import { NextRequest } from "next/server";
import { getAuthMember, jsonError } from "@/lib/api-helpers";
import { getRoomState, touchPresence } from "@/lib/room-repo";

export const dynamic = "force-dynamic";

/** GET /api/state — state penuh room sesuai role; kunci jawaban tidak pernah dikirim. */
export async function GET(req: NextRequest) {
  const member = await getAuthMember();
  if (!member) return jsonError("Belum terautentikasi", 401);

  await touchPresence(member.id, true);
  const state = await getRoomState(member.room_id);
  if (!state.room) return jsonError("Room tidak ditemukan", 404);

  const { rooms: room, ...memberRow } = member as typeof member & { rooms?: Record<string, unknown> };
  void room;

  // sanitasi: sesuai role
  const isHost = memberRow.role === "host";
  const safeState = {
    room: {
      code: state.room.code,
      status: state.room.status,
      version: state.room.version,
      gameOrder: state.room.game_order,
      expiresAt: state.room.expires_at,
    },
    self: { role: memberRow.role, displayName: memberRow.display_name },
    members: state.members,
    sessions: state.sessions,
    totalPoints: (state.ledger ?? []).reduce((a: number, r: { points: number }) => a + r.points, 0),
    serverTime: new Date().toISOString(),
  };

  return Response.json({ ok: true, ...safeState, isHost, state: isHost ? undefined : safeState });
}
