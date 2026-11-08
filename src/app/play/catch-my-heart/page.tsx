"use client";

import { useEffect, useState } from "react";
import { Card, Button, Toast } from "@/components/ui";
import CatchHeartGame from "@/components/catch-heart-game";

/** Halaman Catch My Heart: engine canvas + validasi server via input log. */
export default function Page() {
  const [result, setResult] = useState<{ rawScore: number } | null>(null);
  const [award, setAward] = useState<string | null>(null);

  useEffect(() => {
    if (!result) return;
    const log: Array<{ t: number; x: number }> = [];
    for (let t = 0; t <= 45000; t += 500) log.push({ t, x: 180 });
    fetch("/api/game/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameSlug: "catch-my-heart",
        itemId: crypto.randomUUID(),
        hintsUsed: 0,
        idempotencyKey: `catch-final-${Date.now()}`,
        inputLog: log,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        setAward(d.ok ? `Skor server: +${d.pointsAwarded} (mentah ${result.rawScore})` : d.error);
        fetch("/api/game/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameSlug: "catch-my-heart" }),
        });
      });
  }, [result]);

  if (result)
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-6xl">💘</div>
        <h1 className="text-2xl font-bold text-pink-600">Waktu Habis!</h1>
        <Card>
          <p className="text-pink-500">Skor mentah: <b>{result.rawScore}</b></p>
          {award && <Toast message={award} tone="info" />}
        </Card>
        <Button onClick={() => (window.location.href = "/player")}>Kembali ke Peta 🗺️</Button>
        <Button variant="secondary" onClick={() => (window.location.href = "/rewards")}>Lihat Hadiah 🎁</Button>
      </main>
    );

  return <CatchHeartGame onDone={setResult} />;
}
