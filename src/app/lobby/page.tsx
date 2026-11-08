"use client";

import { useState } from "react";
import { Button, Card, Loader, ConnectionBanner } from "@/components/ui";
import { useRoomState } from "@/lib/use-room-state";

export default function LobbyPage() {
  const { state, connState, error } = useRoomState();
  const [starting, setStarting] = useState(false);

  if (error === "unauthorized") {
    return <main className="p-6"><Card>Belum join room. <a className="text-pink-600 underline" href="/join">Join di sini</a> atau <a className="text-pink-600 underline" href="/create">buat room</a>.</Card></main>;
  }
  if (!state) return <Loader />;

  const isHost = state.self.role === "host";
  const hostMember = state.members.find((m) => m.role === "host");
  const playerMember = state.members.find((m) => m.role === "player");

  async function start() {
    setStarting(true);
    await fetch("/api/host/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    });
    setStarting(false);
    window.location.href = isHost ? "/host" : "/player";
  }

  const statusDot = (connected?: boolean) => (connected ? "🟢" : "🟡");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-5 pt-12">
      <ConnectionBanner state={connState} />
      <h1 className="text-center text-2xl font-bold text-pink-600">💗 Lobby</h1>
      <Card className="text-center">
        <p className="text-sm text-pink-400">Kode Room</p>
        <p className="font-mono text-4xl font-bold tracking-widest text-pink-600">{state.room.code}</p>
        <p className="mt-1 text-xs text-pink-400">Bagikan kode ini ke Birthday Player</p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="text-center">
          <p className="text-2xl">{statusDot(hostMember?.connected)}</p>
          <p className="font-semibold">{hostMember?.display_name ?? "—"}</p>
          <p className="text-xs text-pink-400">Host</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl">{playerMember ? statusDot(playerMember.connected) : "⌛"}</p>
          <p className="font-semibold">{playerMember?.display_name ?? "Menunggu…"}</p>
          <p className="text-xs text-pink-400">Birthday Player</p>
        </Card>
      </div>

      {!playerMember && (
        <p className="animate-pulse text-center text-sm text-pink-400">Menunggu player join… 💞</p>
      )}

      {isHost ? (
        <Button onClick={start} disabled={!playerMember || starting}>
          {starting ? "Memulai…" : "Mulai Sesi 💖"}
        </Button>
      ) : (
        <p className="text-center text-sm text-pink-500">Tunggu host menekan Mulai…</p>
      )}
    </main>
  );
}
