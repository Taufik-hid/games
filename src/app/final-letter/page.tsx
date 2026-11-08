"use client";

import { useEffect, useState } from "react";
import { Button, Card, Loader } from "@/components/ui";
import { GAME_TITLES, type GameSlug } from "@/lib/games/constants";

export default function FinalLetterPage() {
  const [data, setData] = useState<{
    ok: boolean;
    body?: { paragraphs?: string[] } | null;
    totalPoints?: number;
    perGame?: Array<{ slug: string; score: number }>;
    error?: string;
  } | null>(null);
  const [shown, setShown] = useState(0); // paragraf bertahap

  useEffect(() => {
    fetch("/api/final-letter", { cache: "no-store" })
      .then((r) => r.json())
      .then(setData);
  }, []);

  // typewriter bertahap — hormati prefers-reduced-motion
  useEffect(() => {
    if (!data?.body?.paragraphs) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(data.body.paragraphs.length);
      return;
    }
    const t = setInterval(() => {
      setShown((s) => {
        if (s >= (data.body?.paragraphs?.length ?? 0)) {
          clearInterval(t);
          return s;
        }
        return s + 1;
      });
    }, 1200);
    return () => clearInterval(t);
  }, [data]);

  if (!data) return <Loader label="Membuka amplop…" />;
  if (!data.ok)
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="text-6xl">🔒</div>
        <Card>
          <p className="font-semibold text-pink-600">{data.error}</p>
          <p className="mt-1 text-xs text-pink-400">Terbuka setelah keenam game selesai.</p>
        </Card>
        <Button onClick={() => (window.location.href = "/player")}>Kembali bermain 💪</Button>
      </main>
    );

  const paragraphs = data.body?.paragraphs ?? [];

  return (
    <main className="mx-auto min-h-dvh max-w-md p-6 pt-12">
      <div className="mb-4 text-center text-6xl">💌</div>
      <h1 className="mb-4 text-center text-2xl font-bold text-pink-600">Untukmu 💗</h1>

      <Card className="mb-4">
        <p className="text-center text-sm text-pink-400">Rekap Love Points</p>
        <p className="text-center text-3xl font-bold text-pink-600">{data.totalPoints}/600</p>
        <div className="mt-2 flex flex-col gap-1">
          {(data.perGame ?? []).map((g) => (
            <div key={g.slug} className="flex justify-between text-xs">
              <span>{GAME_TITLES[g.slug as GameSlug] ?? g.slug}</span>
              <span className="font-semibold">{g.score}/100</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        {paragraphs.slice(0, shown).map((p, i) => (
          <p key={i} className="mb-3 leading-relaxed text-pink-600">{p}</p>
        ))}
        {shown < paragraphs.length && <p className="animate-pulse text-xs text-pink-300">✍️ …</p>}
      </Card>

      <div className="mt-4 text-center text-4xl">
        {shown >= paragraphs.length ? "💖✨💐" : "💗"}
      </div>
    </main>
  );
}
