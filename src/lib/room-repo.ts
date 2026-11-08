import { getSupabaseAdmin } from "@/lib/supabase-server";
import { generateRoomCode } from "@/lib/utils";
import { GAME_SLUGS } from "@/lib/games/constants";

export async function createRoom(opts: {
  displayName: string;
  passcode?: string;
  contentSet: string;
  expiresHours: number;
  hostTokenHash: string;
  passcodeHash?: string;
}) {
  const db = getSupabaseAdmin();

  // content_set
  let csId: string;
  let { data: csRow } = await db.from("content_sets").select("id").eq("kind", opts.contentSet).eq("is_active", true).limit(1).maybeSingle();
  if (!csRow) {
    const { data: created, error } = await db
      .from("content_sets")
      .insert({ name: opts.contentSet === "demo" ? "Demo Set" : "Production Set", kind: opts.contentSet, is_active: true })
      .select("id")
      .single();
    if (error) throw error;
    csRow = created;
    csId = created.id;
    // seed games default untuk content set baru
    await db.from("games").insert(
      GAME_SLUGS.map((slug) => ({
        content_set_id: csId,
        slug,
        title: slug.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
        config: {},
      }))
    );
  } else {
    csId = csRow.id;
  }

  // kode unik (max 5 percobaan)
  let code = "";
  for (let i = 0; i < 5; i++) {
    const candidate = generateRoomCode();
    const { data: existing } = await db.from("rooms").select("id").eq("code", candidate).limit(1).maybeSingle();
    if (!existing) { code = candidate; break; }
  }
  if (!code) throw new Error("Gagal membuat kode room unik");

  const expiresAt = new Date(Date.now() + opts.expiresHours * 3600_000).toISOString();
  const { data: room, error } = await db
    .from("rooms")
    .insert({ code, content_set_id: csId, game_order: [...GAME_SLUGS], host_passcode_hash: opts.passcodeHash ?? null, expires_at: expiresAt })
    .select()
    .single();
  if (error) throw error;

  const { data: member, error: mErr } = await db
    .from("room_members")
    .insert({ room_id: room.id, role: "host", token_hash: opts.hostTokenHash, display_name: opts.displayName })
    .select()
    .single();
  if (mErr) throw mErr;

  return { room, member };
}

export async function findRoomByCode(code: string) {
  const { data } = await getSupabaseAdmin().from("rooms").select("*").eq("code", code).limit(1).maybeSingle();
  return data;
}

export async function findRoomById(id: string) {
  const { data } = await getSupabaseAdmin().from("rooms").select("*").eq("id", id).limit(1).maybeSingle();
  return data;
}

export async function joinRoom(roomId: string, displayName: string, playerTokenHash: string) {
  const db = getSupabaseAdmin();
  const { data: existing } = await db.from("room_members").select("*").eq("room_id", roomId).eq("role", "player").limit(1).maybeSingle();
  if (existing) {
    if (existing.token_hash === playerTokenHash) return { member: existing, rejoin: true };
    return { member: null, rejoin: false, seatTaken: true };
  }
  const { data: member, error } = await db
    .from("room_members")
    .insert({ room_id: roomId, role: "player", token_hash: playerTokenHash, display_name: displayName })
    .select()
    .single();
  if (error) throw error;
  return { member, rejoin: false, seatTaken: false };
}

export async function getMemberByTokenHash(tokenHash: string) {
  const { data } = await getSupabaseAdmin()
    .from("room_members")
    .select("*, rooms(*)")
    .eq("token_hash", tokenHash)
    .limit(1)
    .maybeSingle();
  return data;
}

export async function bumpRoomVersion(roomId: string, eventType: string, payload: Record<string, unknown> = {}) {
  const db = getSupabaseAdmin();
  const { data: room, error } = await db.rpc("bump_room_version", { p_room_id: roomId }).then?.() ?? null;
  // fallback jika rpc belum ada: increment manual
  const { data: current } = await db.from("rooms").select("version").eq("id", roomId).single();
  const { error: vErr } = await db
    .from("rooms")
    .update({ version: (current?.version ?? 0) + 1 })
    .eq("id", roomId);
  if (vErr) throw vErr;
  await db.from("events").insert({ room_id: roomId, type: eventType, payload });
}

export async function touchPresence(memberId: string, connected: boolean) {
  await getSupabaseAdmin()
    .from("room_members")
    .update({ last_seen_at: new Date().toISOString(), connected })
    .eq("id", memberId);
}

export async function getRoomState(roomId: string) {
  const db = getSupabaseAdmin();
  const { data: room } = await db.from("rooms").select("*").eq("id", roomId).single();
  const { data: members } = await db.from("room_members").select("role, display_name, connected, last_seen_at").eq("room_id", roomId);
  const { data: sessions } = await db
    .from("game_sessions")
    .select("status, score, games(slug, title)")
    .eq("room_id", roomId);
  const { data: ledger } = await db.from("points_ledger").select("game_id, points").eq("room_id", roomId);
  return { room, members, sessions, ledger };
}
