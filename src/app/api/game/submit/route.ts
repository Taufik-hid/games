import { NextRequest } from "next/server";
import { getAuthMember, jsonError } from "@/lib/api-helpers";
import { submitAnswerSchema } from "@/lib/validation";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { awardPoints, quizScore, escapeLevelScore, memoryLaneScore, mysteryBoxScore, catchHeartScore } from "@/lib/scoring";
import { normalizeAnswer } from "@/lib/utils";
import { bumpRoomVersion } from "@/lib/room-repo";

export const dynamic = "force-dynamic";

/** POST /api/game/submit — penilaian server penuh. Client hanya kirim jawaban mentah + idempotency key. */
export async function POST(req: NextRequest) {
  const member = await getAuthMember();
  if (!member) return jsonError("Belum terautentikasi", 401);
  if (member.role !== "player") return jsonError("Hanya player yang bisa submit jawaban", 403);

  const db = getSupabaseAdmin();
  const { data: room } = await db.from("rooms").select("*").eq("id", member.room_id).single();
  if (!room) return jsonError("Room tidak ditemukan", 404);
  if (room.status === "paused") return jsonError("Sesi dijeda host", 409);
  if (room.status !== "playing") return jsonError("Sesi belum berjalan", 409);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Body tidak valid", 400);
  }
  const parsed = submitAnswerSchema.safeParse(body);
  if (!parsed.success) return jsonError("Data submit tidak valid", 400);
  const { gameSlug, itemId, answer, hintsUsed, idempotencyKey, inputLog } = parsed.data;

  const { data: game } = await db
    .from("games")
    .select("id, config")
    .eq("content_set_id", room.content_set_id)
    .eq("slug", gameSlug)
    .single();
  if (!game) return jsonError("Game tidak ditemukan", 404);

  const { data: session } = await db
    .from("game_sessions")
    .select("id, status")
    .eq("room_id", room.id)
    .eq("game_id", game.id)
    .single();
  if (!session) return jsonError("Game belum tersedia", 409);
  if (session.status === "locked") return jsonError("Game masih terkunci", 409);
  if (session.status === "completed") return jsonError("Game sudah selesai", 409);

  const { data: item } = await db
    .from("questions")
    .select("id, type, answer_key, options, order, personal_response, hints")
    .eq("id", itemId)
    .eq("game_id", game.id)
    .single();
  if (!item && gameSlug !== "catch-my-heart") return jsonError("Item tidak ditemukan", 404);
  const itemRow = item as NonNullable<typeof item>;

  // penilaian per game
  let correct = false;
  let points = 0;
  const cfg = (game.config ?? {}) as Record<string, unknown>;

  switch (gameSlug) {
    case "love-quiz": {
      correct = answer != null && normalizeAnswer(answer) === normalizeAnswer(itemRow.answer_key ?? "");
      points = correct ? Math.round(100 / Math.max(1, (cfg.totalQuestions as number) ?? 10)) : 0;
      break;
    }
    case "love-escape-room": {
      correct = answer != null && normalizeAnswer(answer) === normalizeAnswer(itemRow.answer_key ?? "");
      points = correct ? escapeLevelScore(hintsUsed) : 0;
      break;
    }
    case "memory-lane": {
      const { data: prior } = await db
        .from("submissions")
        .select("id")
        .eq("game_session_id", session.id)
        .eq("item_id", itemRow.id)
        .limit(1)
        .maybeSingle();
      const attempt = prior ? 2 : 1; // percobaan pertama vs kedua (idempotent guard di ledger menahan lebih)
      correct = answer != null && normalizeAnswer(answer) === normalizeAnswer(itemRow.answer_key ?? "");
      points = correct ? memoryLaneScore(attempt) : 0;
      break;
    }
    case "mystery-box": {
      // kotak hanya dibuka, tidak dinilai benar/salah
      correct = true;
      points = mysteryBoxScore(itemRow.order);
      break;
    }
    case "guess-the-song": {
      correct = answer != null && normalizeAnswer(answer) === normalizeAnswer(itemRow.answer_key ?? "");
      points = correct ? 20 : 0;
      break;
    }
    case "catch-my-heart": {
      // replay deterministik server dari input log + seed config; skor final via item final (tanpa questions row)
      const { simulateCatchHeart } = await import("@/lib/catch-heart-sim");
      if (!inputLog || !Array.isArray(inputLog)) return jsonError("Log input wajib untuk game ini", 400);
      const seed = Number((cfg.seedPerRoom as Record<string, number> | undefined)?.[room.id] ?? 12345); // seed per room disimpan saat game mulai
      const target = (cfg.scoreTarget as number) ?? 50;
      const raw = simulateCatchHeart(seed, inputLog, cfg);
      correct = raw > 0;
      points = catchHeartScore(raw, target);
      // item opsional: jika ada row final result, gunakan; jika tidak, itemId bebas (ledger per item diganti reason)
      if (item) break;
      // itemId UUID deterministik per room+game (satu award per game; repeat → duplicate)
      const resultUuid = (await import("node:crypto")).createHash("sha256")
        .update(`catch-result:${room.id}:${game.id}`).digest("hex").slice(0, 32)
        .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
      const awardDirect = await awardPoints({
        roomId: room.id,
        gameId: game.id,
        itemId: resultUuid,
        points,
        reason: "catch-my-heart:result",
      });
      await bumpRoomVersion(room.id, "player:submit", { gameSlug });
      return Response.json({
        ok: true,
        correct: awardDirect.pointsAwarded > 0,
        pointsAwarded: awardDirect.pointsAwarded,
        duplicate: awardDirect.duplicate,
        gameTotal: awardDirect.gameTotal,
        personalResponse: null,
        rawScore: raw,
      });
    }
    default:
      return jsonError("Game tidak dikenal", 400);
  }

  // catat submission (UNIQUE game_session+item) lalu award ledger — hanya untuk game berbasis item
  if (itemRow) {
    const { error: subErr } = await db.from("submissions").insert({
      game_session_id: session.id,
      item_id: itemRow.id,
      answer: answer ?? null,
      is_correct: correct,
      points_awarded: points,
      hints_used: hintsUsed,
      idempotency_key: idempotencyKey,
    });
    if (subErr && subErr.code !== "23505") return jsonError("Gagal menyimpan jawaban", 500);
  }

  if (itemRow) {
    const award = await awardPoints({
      roomId: room.id,
      gameId: game.id,
      itemId: itemRow.id,
      points,
      reason: `${gameSlug}:${itemRow.type ?? "item"}`,
    });

    await bumpRoomVersion(room.id, "player:submit", { gameSlug, itemId: itemRow.id });

    // respons TIDAK memuat answer_key
    return Response.json({
      ok: true,
      correct,
      pointsAwarded: award.pointsAwarded,
      duplicate: award.duplicate,
      gameTotal: award.gameTotal,
      personalResponse: itemRow.personal_response ?? null,
    });
  }
  return jsonError("Item tidak valid", 400);
}
