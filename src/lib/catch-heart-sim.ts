/**
 * Simulasi deterministik Catch My Heart — dijalankan di SERVER.
 * Client hanya mengirim log input (waktu + posisi keranjang); server
 * mereplay fisika dengan seed yang sama, menolak log mustahil, dan
 * membatasi skor maksimum via catchHeartScore().
 */
export type InputEntry = { t: number; x: number };
export type SimConfig = {
  durationSec?: number;
  spawnIntervalMs?: number;
  fallSpeed?: number;
  basketWidth?: number;
  maxBasketSpeed?: number; // batas fisik px/s untuk deteksi kecurangan
};

const W = 360; // lebar layar logis
const H = 640;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Jalankan ulang simulasi. Mengembalikan skor mentah (hati tertangkap + bonus - penalti). */
export function simulateCatchHeart(seed: number, inputLog: InputEntry[], cfg: SimConfig = {}): number {
  const duration = (cfg.durationSec ?? 45) * 1000;
  const spawnEvery = cfg.spawnIntervalMs ?? 800;
  const fallSpeed = cfg.fallSpeed ?? 160; // px/s
  const basketW = cfg.basketWidth ?? 64;
  const maxSpeed = cfg.maxBasketSpeed ?? 2000;

  // validasi log: urut waktu, dalam durasi, kecepatan keranjang fisik
  let lastT = -1;
  let lastX: number | null = null;
  for (const e of inputLog) {
    if (typeof e.t !== "number" || typeof e.x !== "number") return 0;
    if (e.t < 0 || e.t > duration) return 0;
    if (e.x < 0 || e.x > W) return 0;
    if (e.t < lastT) return 0; // waktu mundur = manipulasi
    if (lastX !== null && e.t > lastT) {
      const v = Math.abs(e.x - lastX) / Math.max(1, (e.t - lastT) / 1000);
      if (v > maxSpeed) return 0; // mustahil secara fisik
    }
    lastT = e.t;
    lastX = e.x;
  }

  const rnd = mulberry32(seed);
  let raw = 0;

  // spawn schedule deterministik dari seed
  type Obj = { x: number; spawnAt: number; kind: "heart" | "bonus" | "nuisance" };
  const spawns: Obj[] = [];
  for (let t = 500; t <= duration; t += spawnEvery) {
    const roll = rnd();
    const kind: Obj["kind"] = roll < 0.75 ? "heart" : roll < 0.9 ? "bonus" : "nuisance";
    spawns.push({ x: 20 + rnd() * (W - 40), spawnAt: t, kind });
  }

  // replay: posisi keranjang di waktu tiap spawn+catch window
  const posAt = (t: number): number => {
    let best: InputEntry | null = null;
    for (const e of inputLog) {
      if (e.t <= t) best = e;
      else break;
    }
    return best?.x ?? W / 2;
  };

  const catchWindowMs = (H / fallSpeed) * 1000; // waktu jatuh
  for (const s of spawns) {
    const tCatch = s.spawnAt + catchWindowMs;
    if (tCatch > duration) continue;
    const bx = posAt(tCatch);
    const hit = Math.abs(bx - s.x) < basketW / 2 + 14;
    if (hit) {
      if (s.kind === "heart") raw += 2;
      else if (s.kind === "bonus") raw += 5;
      else raw -= 3; // pengganggu tertangkap
    }
  }
  return Math.max(0, raw);
}
