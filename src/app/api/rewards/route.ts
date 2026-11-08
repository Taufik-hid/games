import { NextRequest } from "next/server";
import { getAuthMember, jsonError } from "@/lib/api-helpers";
import { listRewards } from "@/lib/rewards";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/** GET /api/rewards — daftar reward; konten nyata hanya bila terbuka. */
export async function GET(_req: NextRequest) {
  const member = await getAuthMember();
  if (!member) return jsonError("Belum terautentikasi", 401);
  const rewards = await listRewards(member.room_id);
  return Response.json({ ok: true, rewards });
}
