import { NextRequest } from "next/server";
import { getAuthMember, jsonError } from "@/lib/api-helpers";
import { hostActionSchema } from "@/lib/validation";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { bumpRoomVersion } from "@/lib/room-repo";
import { GAME_SLUGS } from "@/lib/games/constants";

export const dynamic = "force-dynamic";

/** POST /api/host/action — hanya host. */
export async function POST(req: NextRequest) {
  const member = await getAuthMember();
  if (!member) return jsonError("Belum terautentikasi", 401);
  if (member.role !== "host") return jsonError("Aksi ini hanya untuk host", 403);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Body tidak valid", 400);
  }
  const parsed = hostActionSchema.safeParse(body);
  if (!parsed.success) return jsonError("Aksi tidak valid", 400);
  const { action, gameSlug, gameOrder } = parsed.data;
  const db = getSupabaseAdmin();
  const roomId = member.room_id;

  switch (action) {
    case "start":
    case "resume": {
      await db.from("rooms").update({ status: "playing" }).eq("id", roomId);
      // buat game_sessions untuk semua game (locked kecuali yang pertama available)
      const orderRes = await db.from("rooms").select("game_order").eq("id", roomId).single();
      const order = gameOrder ?? (orderRes.data!.game_order as string[]);
      const { data: roomRow } = await db.from("rooms").select("content_set_id").eq("id", roomId).single();
      const { data: games } = await db.from("games").select("id, slug").eq("content_set_id", roomRow!.content_set_id);
      for (const slug of order as string[]) {
        const g = games?.find((x) => x.slug === slug);
        if (!g) continue;
        await db.from("game_sessions").upsert(
          { room_id: roomId, game_id: g.id, status: slug === order[0] ? "available" : "locked" },
          { onConflict: "room_id,game_id" }
        );
      }
      break;
    }
    case "pause":
      await db.from("rooms").update({ status: "paused" }).eq("id", roomId);
      break;
    case "finish":
      await db.from("rooms").update({ status: "finished" }).eq("id", roomId);
      break;
    case "reorder": {
      if (!gameOrder || gameOrder.length !== 6 || new Set(gameOrder).size !== 6 || gameOrder.some((s) => !GAME_SLUGS.includes(s as never)))
        return jsonError("Urutan game tidak valid", 400);
      await db.from("rooms").update({ game_order: gameOrder }).eq("id", roomId);
      break;
    }
    case "set-game-status": {
      if (!gameSlug) return jsonError("gameSlug wajib", 400);
      const { data: roomRow2 } = await db.from("rooms").select("content_set_id").eq("id", roomId).single();
      const { data: game } = await db.from("games").select("id").eq("content_set_id", roomRow2!.content_set_id).eq("slug", gameSlug).maybeSingle();
      if (!game) return jsonError("Game tidak ditemukan", 404);
      const status = parsed.data.action === "set-game-status" ? (body as { setStatus?: string }).setStatus : undefined;
      if (!status || !["locked", "available"].includes(status)) return jsonError("Status tidak valid", 400);
      await db.from("game_sessions").upsert({ room_id: roomId, game_id: game.id, status }, { onConflict: "room_id,game_id" });
      break;
    }
    case "reset-room": {
      await db.from("game_sessions").delete().eq("room_id", roomId);
      await db.from("points_ledger").delete().eq("room_id", roomId);
      await db.from("reward_unlocks").delete().eq("room_id", roomId);
      await db.from("rooms").update({ status: "lobby" }).eq("id", roomId);
      break;
    }
    case "reset-game": {
      if (!gameSlug) return jsonError("gameSlug wajib", 400);
      const { data: roomRow3 } = await db.from("rooms").select("content_set_id").eq("id", roomId).single();
      const { data: game } = await db.from("games").select("id").eq("content_set_id", roomRow3!.content_set_id).eq("slug", gameSlug).maybeSingle();
      if (!game) return jsonError("Game tidak ditemukan", 404);
      await db.from("points_ledger").delete().eq("room_id", roomId).eq("game_id", game.id);
      await db.from("game_sessions").delete().eq("room_id", roomId).eq("game_id", game.id);
      break;
    }
    case "reset-seat": {
      const { error } = await db.from("room_members").delete().eq("room_id", roomId).eq("role", "player");
      if (error) return jsonError("Gagal reset seat", 500);
      break;
    }
    default:
      return jsonError("Aksi tidak dikenal", 400);
  }

  await bumpRoomVersion(roomId, `host:${action}`, { gameSlug });
  return Response.json({ ok: true });
}
