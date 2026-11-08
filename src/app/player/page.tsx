"use client";

import { Card, ConnectionBanner, Loader } from "@/components/ui";
import { useRoomState } from "@/lib/use-room-state";
import { GAME_TITLES, MAX_TOTAL_POINTS, type GameSlug } from "@/lib/games/constants";

const STATUS_STYLE: Record<string, string> = {
  locked: "opacity-40 grayscale",
  available: "ring-2 ring-pink-300",
  in_progress: "ring-2 ring-amber-300",
  completed: "ring-2 ring-green-300",
};
const STATUS_LABEL: Record<string, string> = {
  locked: "🔒 Terkunci",
  available: "▶️ Bisa dimainkan",
  in_progress: "⏳ Sedang bermain",
  completed: "✅ Selesai",
};

export default function PlayerMap() {
  const { state, connState, error } = useRoomState(1500);

  if (error === "unauthorized") {
    return <main className="p-6"><Card>Belum join room. <a className="text-pink-600 underline" href="/join">Join di sini</a>.</Card></main>;
  }
  if (!state) return <Loader />;
  if (state.self.role !== "player") {
    return <main className="p-6"><Card>Halaman ini khusus Birthday Player.</Card></main>;
  }

  if (state.room.status === "paused") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md items-center justify-center p-6">
        <Card className="text-center">
          <p className="text-4xl">⏸</p>
          <h1 className="mt-2 text-xl font-bold text-pink-600">Sesi Dijeda</h1>
          <p className="mt-1 text-sm text-pink-400">Host sedang mengambil jeda. Sabar ya… 💞</p>
        </Card>
      </main>
    );
  }

  const sessionBySlug = Object.fromEntries(
    (state.sessions ?? []).map((s) => [s.games?.slug, s])
  );
  const completed = (state.sessions ?? []).filter((s) => s.status === "completed").length;

  return (
    <main className="mx-auto min-h-dvh max-w-md p-5 pt-12">
      <ConnectionBanner state={connState} />
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-xl font-bold text-pink-600">🗺️ Peta Game</h1>
        <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-semibold text-pink-600">
          {state.room.status}
        </span>
      </div>
      <p className="mb-4 text-sm text-pink-500">
        Progres: <b>{completed}/6</b> · Love Points: <b>{state.totalPoints}/{MAX_TOTAL_POINTS}</b>
      </p>

      <a href="/rewards" className="scrapbook-card mb-3 flex items-center justify-between !py-3">
        <span className="font-semibold">🎁 Koleksi Hadiah</span>
        <span className="text-xs text-pink-400">buka →</span>
      </a>
      <a href="/final-letter" className="scrapbook-card mb-4 flex items-center justify-between !py-3">
        <span className="font-semibold">💌 Final Letter</span>
        <span className="text-xs text-pink-400">{completed >= 6 ? "TERBUKA — tap!" : "terkunci 🔒"}</span>
      </a>

      <div className="flex flex-col gap-3">
        {state.room.gameOrder.map((slug, i) => {
          const sess = sessionBySlug[slug];
          const status = sess?.status ?? "locked";
          const playable = status === "available" || status === "in_progress";
          return (
            <Card key={slug} className={`${STATUS_STYLE[status]} flex items-center justify-between`}>
              <div>
                <p className="font-semibold">
                  {i + 1}. {GAME_TITLES[slug as GameSlug] ?? slug}
                </p>
                <p className="text-xs text-pink-400">{STATUS_LABEL[status]} · {sess?.score ?? 0}/100</p>
              </div>
              {playable && (
                <a
                  href={`/play/${slug}`}
                  className="rounded-full bg-pink-400 px-4 py-2 font-semibold text-white"
                >
                  Main
                </a>
              )}
            </Card>
          );
        })}
      </div>
    </main>
  );
}
