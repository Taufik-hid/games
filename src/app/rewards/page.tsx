"use client";

import { useEffect, useState } from "react";
import { Button, Card, Loader } from "@/components/ui";
import { GAME_TITLES, type GameSlug } from "@/lib/games/constants";

type RewardItem = {
  slug: string;
  title: string;
  unlockRule: string;
  unlocked: boolean;
  body: Record<string, unknown> | null;
};

export default function RewardsPage() {
  const [rewards, setRewards] = useState<RewardItem[] | null>(null);
  const [open, setOpen] = useState<RewardItem | null>(null);

  useEffect(() => {
    fetch("/api/rewards", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setRewards(d.rewards ?? []));
  }, []);

  if (!rewards) return <Loader label="Menyiapkan koleksi hadiah…" />;

  return (
    <main className="mx-auto min-h-dvh max-w-md p-5 pt-12">
      <h1 className="mb-4 text-xl font-bold text-pink-600">🎁 Koleksi Hadiah</h1>
      <div className="grid grid-cols-2 gap-3">
        {rewards.map((r) => (
          <button
            key={r.slug}
            onClick={() => r.unlocked && setOpen(r)}
            className={`scrapbook-card flex flex-col items-center gap-2 p-4 text-center ${r.unlocked ? "ring-2 ring-pink-300" : "opacity-50 grayscale"}`}
            aria-disabled={!r.unlocked}
          >
            <span className="text-4xl">{r.unlocked ? EMOJI[r.slug] ?? "💝" : "🔒"}</span>
            <span className="text-sm font-semibold">{r.title}</span>
            <span className="text-[10px] text-pink-400">{r.unlocked ? "Tap untuk buka" : `Selesaikan ${r.unlockRule.replace(/-/g, " ")}`}</span>
          </button>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(null)}>
          <div className="scrapbook-card max-h-[80dvh] w-full max-w-md overflow-auto p-6" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-xl font-bold text-pink-600">{EMOJI[open.slug] ?? "💝"} {open.title}</h2>
            <RewardBody body={open.body} />
            <Button className="mt-4 w-full" variant="secondary" onClick={() => setOpen(null)}>Tutup</Button>
          </div>
        </div>
      )}
      <Button className="mt-6 w-full" variant="secondary" onClick={() => (window.location.href = "/player")}>Kembali ke Peta 🗺️</Button>
    </main>
  );
}

const EMOJI: Record<string, string> = {
  "love-note": "💌",
  "memory-photo": "📷",
  "secret-gift": "🎀",
  "virtual-flowers": "🌷",
  "our-memories": "🎶",
  "final-letter": "💌",
};

function RewardBody({ body }: { body: Record<string, unknown> | null }) {
  if (!body) return <p className="text-sm text-pink-400">Konten tidak tersedia.</p>;
  return (
    <div className="flex flex-col gap-2 text-pink-600">
      {typeof body.text === "string" && <p>{body.text}</p>}
      {typeof body.caption === "string" && <p>{body.caption}</p>}
      {Array.isArray(body.paragraphs) &&
        (body.paragraphs as string[]).map((p, i) => (
          <p key={i} style={{ animationDelay: `${i * 0.6}s` }} className="fade-in-paragraph">{p}</p>
        ))}
    </div>
  );
}
