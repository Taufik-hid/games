"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Loader, Toast } from "@/components/ui";
import { GAME_TITLES, type GameSlug } from "@/lib/games/constants";

type QItem = {
  id: string;
  order: number;
  prompt: string;
  options?: string[] | null;
  answer_key?: string | null;
  hints?: string[] | null;
  personal_response?: string | null;
};

export default function EditorPage() {
  const [state, setState] = useState<{
    ok: boolean;
    rewards?: Array<{ slug: string; title: string; body: Record<string, unknown> }>;
    completeness?: Array<{ slug: string; title: string; filled: number; expected: number }>;
    error?: string;
  } | null>(null);
  const [activeGame, setActiveGame] = useState<GameSlug>("love-quiz");
  const [items, setItems] = useState<QItem[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    const d = await fetch("/api/editor/content", { cache: "no-store" }).then((r) => r.json());
    setState(d);
  }, []);

  const loadItems = useCallback(async (slug: GameSlug) => {
    setItems(null);
    const d = await fetch(`/api/editor/questions?gameSlug=${slug}`, { cache: "no-store" }).then((r) => r.json());
    setItems(d.items ?? []);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);
  useEffect(() => {
    loadItems(activeGame);
  }, [activeGame, loadItems]);

  if (state?.error === "Hanya host" || (!state && !items))
    return <Loader label="Memeriksa akses…" />;

  if (state?.error)
    return <main className="p-6"><Card>{state.error}</Card></main>;

  async function saveQuestion(q: QItem, isNew = false) {
    const res = await fetch("/api/editor/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameSlug: activeGame,
        order: q.order,
        prompt: q.prompt,
        options: q.options ?? undefined,
        answerKey: q.answer_key ?? undefined,
        hints: q.hints ?? undefined,
        personalResponse: q.personal_response ?? undefined,
        ...(isNew ? {} : { id: q.id }),
      }),
    });
    const d = await res.json();
    setMsg(res.ok ? `Soal #${q.order} tersimpan ✅` : d.error);
    loadItems(activeGame);
    loadAll();
  }

  async function removeQuestion(id: string) {
    const res = await fetch(`/api/editor/questions?id=${id}`, { method: "DELETE" });
    setMsg(res.ok ? "Soal dihapus" : "Gagal menghapus");
    loadItems(activeGame);
    loadAll();
  }

  async function saveReward(slug: string, title: string, bodyText: string) {
    const res = await fetch("/api/editor/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, title, body: { text: bodyText } }),
    });
    setMsg(res.ok ? "Reward tersimpan ✅" : "Gagal menyimpan reward");
  }

  return (
    <main className="mx-auto min-h-dvh max-w-lg p-5 pt-12">
      <h1 className="mb-3 text-xl font-bold text-pink-600">✏️ Content Editor (Host)</h1>
      {msg && <div className="mb-3"><Toast message={msg} tone="success" /></div>}

      <h2 className="mb-2 font-semibold text-pink-600">Kelengkapan</h2>
      <Card className="mb-4">
        <div className="flex flex-col gap-1 text-sm">
          {(state?.completeness ?? []).map((c) => (
            <div key={c.slug} className="flex justify-between">
              <span>{c.title}</span>
              <span className={c.filled >= c.expected ? "text-green-600 font-semibold" : "text-amber-600"}>
                {c.filled}/{c.expected}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <h2 className="mb-2 font-semibold text-pink-600">Edit Soal</h2>
      <div className="mb-3 flex flex-wrap gap-2">
        {(Object.keys(GAME_TITLES) as GameSlug[]).filter((s) => s !== "catch-my-heart").map((s) => (
          <button
            key={s}
            onClick={() => setActiveGame(s)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${activeGame === s ? "bg-pink-400 text-white" : "bg-pink-100 text-pink-600"}`}
          >
            {GAME_TITLES[s]}
          </button>
        ))}
      </div>

      {!items ? (
        <Loader />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((q) => (
            <Card key={q.id}>
              <p className="mb-1 text-xs text-pink-400">#{q.order} {q.options?.length ? "(pilihan)" : "(teks)"}</p>
              <textarea
                className="w-full rounded-xl border border-pink-200 px-3 py-2 text-sm"
                value={q.prompt}
                rows={2}
                onChange={(e) => setItems(items.map((x) => x.id === q.id ? { ...x, prompt: e.target.value } : x))}
              />
              {q.options?.length ? (
                <p className="mt-1 text-xs text-pink-400">Opsi: {q.options.join(" · ")}</p>
              ) : null}
              <input
                className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 text-sm"
                value={q.answer_key ?? ""}
                placeholder="Kunci jawaban (hanya terlihat host)"
                onChange={(e) => setItems(items.map((x) => x.id === q.id ? { ...x, answer_key: e.target.value } : x))}
              />
              <input
                className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 text-sm"
                value={q.personal_response ?? ""}
                placeholder="Respons personal"
                onChange={(e) => setItems(items.map((x) => x.id === q.id ? { ...x, personal_response: e.target.value } : x))}
              />
              <div className="mt-2 flex gap-2">
                <Button className="!py-2 text-sm" onClick={() => saveQuestion(q)}>Simpan</Button>
                <Button className="!py-2 text-sm" variant="danger" onClick={() => removeQuestion(q.id)}>Hapus</Button>
              </div>
            </Card>
          ))}
          <Button
            variant="secondary"
            onClick={() => {
              const newQ: QItem = { id: `new-${Date.now()}`, order: (items.at(-1)?.order ?? 0) + 1, prompt: "", answer_key: "", personal_response: "" };
              saveQuestion(newQ, true);
            }}
          >
            + Tambah Soal
          </Button>
        </div>
      )}

      <h2 className="mb-2 mt-6 font-semibold text-pink-600">Edit Hadiah & Surat Final</h2>
      <div className="flex flex-col gap-3 pb-12">
        {(state?.rewards ?? []).map((r) => {
          const bodyAny = r.body as { text?: string; paragraphs?: string[] } | null;
          const initial = typeof bodyAny?.text === "string" ? bodyAny.text : Array.isArray(bodyAny?.paragraphs) ? bodyAny!.paragraphs!.join("\n") : "";
          return <RewardEditor key={r.slug} slug={r.slug} title={r.title} initialText={initial} onSave={saveReward} />;
        })}
      </div>
    </main>
  );
}

function RewardEditor({
  slug,
  title,
  initialText,
  onSave,
}: {
  slug: string;
  title: string;
  initialText: string;
  onSave: (slug: string, title: string, text: string) => void;
}) {
  const [text, setText] = useState(initialText);
  const [t, setT] = useState(title);
  return (
    <Card>
      <input className="mb-1 w-full rounded-xl border border-pink-200 px-3 py-2 text-sm font-semibold" value={t} onChange={(e) => setT(e.target.value)} />
      <textarea className="w-full rounded-xl border border-pink-200 px-3 py-2 text-sm" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
      <Button className="mt-2 !py-2 text-sm" onClick={() => onSave(slug, t, text)}>Simpan {title}</Button>
    </Card>
  );
}

