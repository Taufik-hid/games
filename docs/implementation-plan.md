# Implementation Plan — HER DAY ARCADE

## Fase 0 — Audit
Repo baru kosong (di-init 2026-11-09, branch `main`). Tidak ada kode existing yang harus dipertahankan; guardrails "jangan rewrite" otomatis terpenuhi.

## Keputusan Stack (Bagian 5, default dipakai)
- **Next.js 15 (App Router) + TypeScript strict + Tailwind CSS** — satu codebase, mobile-first, route handlers untuk semua operasi server.
- **Supabase** (Postgres + Realtime + Storage) — DB, realtime, dan media storage; service role key hanya di server, RLS deny-by-default.
- **Zod** validasi input; **Vitest** unit/integration; **Playwright** E2E dua konteks browser.
- Alasan: multiplayer realtime 2 pemain tanpa WebSocket server sendiri; deploy Vercel; free tier cukup.

## Pola Arsitektur
- Semua tulis/baca sensitif via route handlers (`app/api/**`). Client tidak pernah menulis ke tabel game/skor.
- Realtime hanya membawa sinyal `room_version`; client resync via `GET /api/state`.
- State room pakai `rooms.version` (optimistic concurrency).
- Token host/player: CSPRNG ≥128 bit, disimpan SHA-256 hash, cookie httpOnly+Secure+SameSite=Lax.
- Poin dihitung server; ledger append-only + UNIQUE constraint + idempotency key.
- Catch My Heart: server terbitkan seed, client kirim input log, server replay deterministik, cap 100.

## Struktur Target
```
src/
  app/            (pages: landing, create, join, lobby, host/, player/, api/)
  lib/            (db, auth, scoring, games/, validation, realtime)
  components/     (ui dasar + game components)
  content/        (seed demo generik, template produksi)
docs/implementation-plan.md
tests/ (unit, integration, e2e)
```

## File yang Akan Dibuat (ringkas)
- Skema SQL migrasi + RLS + seed (supabase/migrations)
- `src/lib/auth.ts` (token, hash, cookie), `src/lib/room.ts` (kode room, state machine), `src/lib/scoring.ts`, `src/lib/games/*` (6 game), `src/lib/catch-heart-sim.ts`
- Route handlers: `/api/room/create|join|state|action`, `/api/game/*` (start, submit, score), `/api/editor/*`, `/api/rewards/*`, `/api/final-letter`
- Halaman: landing, create, join, lobby, host dashboard, player map, 6 game UI, rewards, final letter, editor
- `docs/` plan + README + panduan deploy; `.env.example`

## Risiko
- Supabase project perlu dibuat user (keys via env) — development lokal bisa lanjut dengan Supabase local/atau mock; deployment butuh kredensial.
- E2E realtime dua konteks perlu instance DB yang konsisten.
- Audio Guess the Song tergantung upload pengguna; fallback skip ronde disiapkan.

## Baseline
Repo kosong → baseline build/lint/test: belum ada; tooling dibangun di Fase 1 dan baseline dicatat setelahnya.

## Urutan Kerja
Fase 1 → 2 → 3 → 4 (6 game) → 5 → 6 → 7 → 8 → 9 → 10, test-first tiap fase, gate lulus sebelum lanjut.
