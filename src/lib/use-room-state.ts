"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RoomStateResponse = {
  ok: boolean;
  room: { code: string; status: string; version: number; gameOrder: string[] };
  self: { role: "host" | "player"; displayName: string };
  members: Array<{ role: string; display_name: string; connected: boolean; last_seen_at: string }>;
  sessions: Array<{ status: string; score: number; games: { slug: string; title: string } | null }>;
  totalPoints: number;
};

/** Hook realtime: poll + resync penuh saat visibility/online kembali. Realtime channel Supabase dipasang jika tersedia. */
export function useRoomState(pollMs = 2000) {
  const [state, setState] = useState<RoomStateResponse | null>(null);
  const [connState, setConnState] = useState<"online" | "reconnecting" | "offline">("online");
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (res.status === 401) {
        setError("unauthorized");
        return;
      }
      if (!res.ok) throw new Error("gagal");
      const data = await res.json();
      if (mounted.current) {
        setState(data);
        setConnState("online");
        setError(null);
      }
    } catch {
      if (mounted.current) setConnState("reconnecting");
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    fetchState();
    const t = setInterval(fetchState, pollMs);

    const onVis = () => {
      if (document.visibilityState === "visible") fetchState(); // resync penuh
    };
    const onOnline = () => fetchState();
    const onOffline = () => setConnState("offline");
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      mounted.current = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [fetchState, pollMs]);

  return { state, connState, error, refetch: fetchState };
}
