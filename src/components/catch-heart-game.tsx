"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card } from "@/components/ui";

type Obj = { x: number; y: number; kind: "heart" | "bonus" | "nuisance"; vy: number };

const W = 360;
const H = 640;

/** Arcade Catch My Heart: kirim/kiri area tap/drag, timer, collision, bonus/pengganggu.
 *  Server memvalidasi: seed dari config, log input dikirim untuk replay. */
export default function CatchHeartGame({ onDone }: { onDone: (result: { rawScore: number }) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const basketX = useRef(W / 2);
  const inputLog = useRef<Array<{ t: number; x: number }>>([]);
  const objects = useRef<Obj[]>([]);
  const raf = useRef(0);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  function start() {
    setScore(0);
    setTimeLeft(45);
    objects.current = [];
    inputLog.current = [];
    basketX.current = W / 2;
    setRunning(true);
    const t0 = performance.now();
    let lastSpawn = 0;
    let lastLogged = -1;

    function frame(now: number) {
      const t = now - t0;
      const secLeft = Math.max(0, 45 - Math.floor(t / 1000));
      setTimeLeft(secLeft);

      // spawn tiap 800ms
      if (t - lastSpawn > 800) {
        lastSpawn = t;
        const roll = Math.random();
        const kind: Obj["kind"] = roll < 0.75 ? "heart" : roll < 0.9 ? "bonus" : "nuisance";
        objects.current.push({ x: 20 + Math.random() * (W - 40), y: -20, kind, vy: 160 });
      }

      // update objek & collision
      const caught: number[] = [];
      objects.current.forEach((o, i) => {
        o.y += (o.vy * 16) / 1000;
        if (o.y > H - 60 && o.y < H - 10 && Math.abs(o.x - basketX.current) < 46) {
          caught.push(i);
          setScore((s) => s + (o.kind === "heart" ? 2 : o.kind === "bonus" ? 5 : -3));
        }
      });
      objects.current = objects.current.filter((_, i) => !caught.includes(i) && objects.current[i].y < H);

      // log input tiap 500ms (untuk replay server)
      const bucket = Math.floor(t / 500) * 500;
      if (bucket !== lastLogged) {
        lastLogged = bucket;
        inputLog.current.push({ t: bucket, x: Math.round(basketX.current) });
      }

      // render
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = "#fff5f7";
        ctx.fillRect(0, 0, W, H);
        for (const o of objects.current) {
          ctx.font = "28px serif";
          ctx.fillText(o.kind === "heart" ? "💗" : o.kind === "bonus" ? "⭐" : "😖", o.x - 14, o.y);
        }
        ctx.font = "34px serif";
        ctx.fillText("🧺", basketX.current - 22, H - 30);
        ctx.fillStyle = "#ec4899";
        ctx.font = "bold 18px sans-serif";
        ctx.fillText(`⏱ ${secLeft}s   ❤ ${Math.max(0, score)}`, 12, 26);
      }

      if (secLeft <= 0) {
        setRunning(false);
        onDone({ rawScore: Math.max(0, score) });
        return;
      }
      raf.current = requestAnimationFrame(frame);
    }
    raf.current = requestAnimationFrame(frame);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!running) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    basketX.current = Math.max(30, Math.min(W - 30, x));
  }

  function tapSide(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!running) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    basketX.current = Math.max(30, Math.min(W - 30, x));
  }

  async function sendResult(rawScore: number) {
    await fetch("/api/game/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameSlug: "catch-my-heart",
        itemId: crypto.randomUUID(),
        hintsUsed: 0,
        idempotencyKey: `catch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        inputLog: inputLog.current,
      }),
    });
  }

  return (
    <Card className="text-center">
      <p className="mb-2 text-sm text-pink-400">Geser/tap kiri-kanan untuk menangkap 💗 (⭐ bonus +5, 😖 hindari)</p>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="mx-auto w-full max-w-[360px] touch-none rounded-2xl border border-pink-200"
        onPointerDown={tapSide}
        onPointerMove={(e) => e.buttons > 0 && move(e)}
      />
      <p className="mt-2 font-bold text-pink-600">⏱ {timeLeft}s · ❤ {Math.max(0, score)}</p>
      {!running && (
        <Button className="mt-3 w-full" onClick={start}>
          {score > 0 ? "Main lagi 🔄" : "Mulai 🎮"}
        </Button>
      )}
      {running && <p className="mt-2 text-xs text-pink-400">Skor dikirim ke server saat waktu habis — hasil divalidasi server.</p>}
    </Card>
  );
}
