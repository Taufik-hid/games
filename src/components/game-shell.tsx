"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Loader, Toast } from "@/components/ui";

export type GameItem = {
  id: string;
  type: string;
  order: number;
  prompt: string;
  options?: string[] | null;
};

export type GameContent = {
  ok: boolean;
  game: { slug: string; title: string; config: Record<string, unknown> };
  items: GameItem[];
};

export function useGameContent(slug: string) {
  const [content, setContent] = useState<GameContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/game/${slug}/content`, { cache: "no-store" });
        const data = await res.json();
        if (!alive) return;
        if (!res.ok) setError(data.error ?? "Gagal memuat game");
        else setContent(data);
      } catch {
        if (alive) setError("Koneksi bermasalah, coba muat ulang");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  return { content, error, loading };
}

export async function submitAnswer(payload: {
  gameSlug: string;
  itemId: string;
  answer?: string;
  hintsUsed?: number;
  inputLog?: Array<{ t: number; x: number }>;
}) {
  const idempotencyKey = `${payload.gameSlug}:${payload.itemId}:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const res = await fetch("/api/game/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, idempotencyKey }),
  });
  return { res, data: await res.json() };
}

/** Kerangka halaman game umum: header, progres, konten, hasil akhir. */
export function GameShell({
  slug,
  title,
  children,
  onFinished,
  finishedMessage,
}: {
  slug: string;
  title: string;
  children?: React.ReactNode;
  onFinished?: () => void;
  finishedMessage?: string;
}) {
  const { content, error, loading } = useGameContent(slug);
  const [done, setDone] = useState(false);

  if (loading) return <Loader label={`Menyiapkan ${title}…`} />;
  if (error)
    return (
      <main className="mx-auto max-w-md p-6 pt-12">
        <Card>
          <p className="font-semibold text-pink-600">{error}</p>
          <Button className="mt-3" onClick={() => (window.location.href = "/player")}>Kembali ke Peta</Button>
        </Card>
      </main>
    );

  if (done) {
    // tandai game selesai di server + buka reward
    fetch("/api/game/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameSlug: slug }),
    }).catch(() => {});
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-6xl">🎉</div>
        <h1 className="text-2xl font-bold text-pink-600">{title} Selesai!</h1>
        <p className="text-pink-500">{finishedMessage ?? "Skor tersimpan. Cek koleksi hadiahmu!"}</p>
        <Button onClick={() => (window.location.href = "/player")}>Kembali ke Peta Game 🗺️</Button>
        <Button variant="secondary" onClick={() => (window.location.href = "/rewards")}>Lihat Hadiah 🎁</Button>
      </main>
    );
  }

  const items = content?.items ?? [];
  const progress = children && (children as { props?: { currentIndex?: number } }).props?.currentIndex;

  return (
    <main className="mx-auto min-h-dvh max-w-md p-5 pt-10">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-pink-600">{title}</h1>
        <span className="text-xs text-pink-400">{content?.game.slug}</span>
      </div>
      {typeof progress === "number" && items.length > 0 && (
        <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-pink-100">
          <div
            className="h-full rounded-full bg-pink-400 transition-all"
            style={{ width: `${((progress + 1) / items.length) * 100}%` }}
          />
        </div>
      )}
      {content && <GameRunner slug={slug} items={items} config={content.game.config} onAllDone={() => setDone(true)} />}
      {children}
      <input type="hidden" data-on-finished={onFinished ? "1" : "0"} />
    </main>
  );
}

/** Loop item generik: render fungsi per item via prop renderItem. */
export function GameRunner({
  slug,
  items,
  config,
  onAllDone,
}: {
  slug: string;
  items: GameItem[];
  config: Record<string, unknown>;
  onAllDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<{ correct: boolean; msg: string; points: number } | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const item = items[index];

  async function submit(payload: Parameters<typeof submitAnswer>[0]) {
    if (submitting) return; // cegah klik ganda
    setSubmitting(true);
    const { res, data } = await submitAnswer(payload);
    setSubmitting(false);
    if (!res.ok) {
      setFeedback({ correct: false, msg: data.error ?? "Gagal", points: 0 });
      return;
    }
    setFeedback({
      correct: !!data.correct,
      msg: data.personalResponse ?? (data.correct ? "Benar! 💖" : "Belum tepat, semangat! 💪"),
      points: data.pointsAwarded,
    });
  }

  function next() {
    setFeedback(null);
    if (index + 1 >= items.length) onAllDone();
    else setIndex(index + 1);
  }

  if (!item) {
    onAllDone();
    return null;
  }

  return (
    <div>
      {feedback && (
        <div className="mb-3">
          <Toast message={`${feedback.correct ? "✅" : "❌"} +${feedback.points} poin — ${feedback.msg}`} tone={feedback.correct ? "success" : "info"} />
          <Button className="mt-2 w-full" onClick={next}>
            {index + 1 >= items.length ? "Selesai 🎉" : "Lanjut 💞"}
          </Button>
        </div>
      )}
      {!feedback && <GameItemInput slug={slug} item={item} config={config} submitting={submitting} onSubmit={submit} />}
    </div>
  );
}

function GameItemInput({
  slug,
  item,
  config,
  submitting,
  onSubmit,
}: {
  slug: string;
  item: GameItem;
  config: Record<string, unknown>;
  submitting: boolean;
  onSubmit: (p: Parameters<typeof submitAnswer>[0]) => void;
}) {
  const [answer, setAnswer] = useState("");
  const [hintsUsed, setHintsUsed] = useState(0);

  if (slug === "mystery-box") {
    return (
      <Card className="text-center">
        <p className="mb-3 text-sm text-pink-400">Kotak #{item.order}</p>
        <button
          className="mx-auto flex h-40 w-40 items-center justify-center rounded-3xl bg-pink-300 text-6xl shadow-lg transition active:scale-95"
          onClick={() => onSubmit({ gameSlug: slug, itemId: item.id, hintsUsed: 0 })}
          disabled={submitting}
          aria-label="Buka kotak"
        >
          🎁
        </button>
      </Card>
    );
  }

  if (slug === "love-quiz" && item.options?.length) {
    return (
      <Card>
        <p className="mb-4 font-medium">{item.prompt}</p>
        <div className="flex flex-col gap-2">
          {item.options.map((opt) => (
            <Button key={opt} variant="secondary" className="!justify-start !normal-case" onClick={() => onSubmit({ gameSlug: slug, itemId: item.id, answer: opt, hintsUsed: 0 })}>
              {opt}
            </Button>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <p className="mb-3 font-medium">{item.prompt}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ gameSlug: slug, itemId: item.id, answer, hintsUsed });
        }}
        className="flex flex-col gap-3"
      >
        <input
          className="w-full rounded-xl border border-pink-200 px-4 py-3 outline-none focus:border-pink-400"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Jawabanmu…"
          required
        />
        <Button type="submit" disabled={!answer.trim() || submitting}>Jawab 💖</Button>
      </form>
    </Card>
  );
}
