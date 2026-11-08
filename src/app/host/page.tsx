"use client";

import { useState } from "react";
import { Button, Card, ConnectionBanner, Loader } from "@/components/ui";
import { useRoomState } from "@/lib/use-room-state";
import { GAME_TITLES, type GameSlug } from "@/lib/games/constants";

export default function HostDashboard() {
  const { state, connState, error, refetch } = useRoomState(1500);
  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState(false);

  if (error === "unauthorized") {
    return <main className="p-6"><Card>Sesi tidak ditemukan. <a className="text-pink-600 underline" href="/create">Buat room</a>.</Card></main>;
  }
  if (!state) return <Loader />;
  if (state.self.role !== "host") {
    return <main className="p-6"><Card>Halaman ini khusus host.</Card></main>;
  }

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    await fetch("/api/host/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    setBusy(false);
    await refetch();
  }

  async function moveGame(slug: GameSlug, dir: -1 | 1) {
    const order = [...state!.room.gameOrder];
    const i = order.indexOf(slug);
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    await act("reorder", { gameOrder: order });
  }

  const sessionBySlug = Object.fromEntries(
    (state.sessions ?? []).map((s) => [s.games?.slug, s])
  );

  return (
    <main className="mx-auto min-h-dvh max-w-md p-5 pt-12">
      <ConnectionBanner state={connState} />
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-pink-600">🎛️ Dashboard Host</h1>
        <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-semibold text-pink-600">
          {state.room.status} · v{state.room.version}
        </span>
      </div>

      <Card className="mb-4">
        <p className="text-sm text-pink-400">Kode Room</p>
        <p className="font-mono text-2xl font-bold tracking-widest text-pink-600">{state.room.code}</p>
        <p className="mt-2 text-sm">
          Player: <b>{state.members.find((m) => m.role === "player")?.display_name ?? "—"}</b>{" "}
          {state.members.find((m) => m.role === "player")?.connected ? "🟢 online" : "🟡 reconnecting"}
        </p>
        <p className="text-sm">Total Love Points: <b>{state.totalPoints}/600</b></p>
      </Card>

      <div className="mb-4 grid grid-cols-3 gap-2">
        {state.room.status === "playing" && (
          <Button variant="secondary" disabled={busy} onClick={() => act("pause")}>⏸ Jeda</Button>
        )}
        {state.room.status === "paused" && (
          <Button disabled={busy} onClick={() => act("resume")}>▶️ Lanjut</Button>
        )}
        {(state.room.status === "playing" || state.room.status === "paused") && (
          <Button variant="secondary" disabled={busy} onClick={() => act("finish")}>🏁 Selesai</Button>
        )}
        {state.room.status === "lobby" && (
          <Button disabled={busy} onClick={() => act("start")}>▶️ Mulai</Button>
        )}
        <Button variant="secondary" disabled={busy} onClick={() => (window.location.href = "/editor")}>✏️ Editor</Button>
        <Button variant="danger" disabled={busy} onClick={() => setConfirmReset(true)}>♻️ Reset</Button>
      </div>

      <h2 className="mb-2 font-semibold text-pink-600">Urutan Game</h2>
      <div className="flex flex-col gap-2">
        {state.room.gameOrder.map((slug, i) => {
          const sess = sessionBySlug[slug];
          return (
            <Card key={slug} className="flex items-center justify-between !py-3">
              <div>
                <p className="font-semibold">{i + 1}. {GAME_TITLES[slug as GameSlug] ?? slug}</p>
                <p className="text-xs text-pink-400">
                  {sess?.status ?? "belum dibuat"} · skor {sess?.score ?? 0}
                </p>
              </div>
              <div className="flex gap-1">
                <button className="rounded-lg bg-pink-50 px-3 py-2" onClick={() => moveGame(slug as GameSlug, -1)} aria-label="naik">▲</button>
                <button className="rounded-lg bg-pink-50 px-3 py-2" onClick={() => moveGame(slug as GameSlug, 1)} aria-label="turun">▼</button>
              </div>
            </Card>
          );
        })}
      </div>

      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <Card className="w-full max-w-sm">
            <h3 className="font-bold text-pink-600">Konfirmasi Reset</h3>
            <p className="mt-2 text-sm">Reset seluruh progres room (skor, game session, reward)? Tidak bisa dibatalkan.</p>
            <div className="mt-4 flex gap-2">
              <Button variant="danger" disabled={busy} onClick={async () => { await act("reset-room"); setConfirmReset(false); }}>
                Ya, reset
              </Button>
              <Button variant="secondary" onClick={() => setConfirmReset(false)}>Batal</Button>
            </div>
          </Card>
        </div>
      )}
    </main>
  );
}
