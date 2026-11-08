# HER DAY ARCADE 💗

Virtual birthday game experience untuk dua pemain — **Birthday Player** bermain 6 game, **Game Host** mengendalikan sesi & mengelola konten. Mobile-first, realtime, skor dihitung server.

## Stack

- Next.js 15 (App Router) + TypeScript strict + Tailwind CSS
- Supabase (Postgres + Storage) — semua akses lewat server (service role), RLS deny-by-default
- Zod (validasi), Vitest (unit/integration), Playwright (E2E — siap dikonfigurasi)

## Menjalankan Lokal

```bash
npm install
cp .env.example .env   # isi SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SESSION_SECRET
set -a && . ./.env && set +a
# jalankan migrasi & seed (SQL editor Supabase atau CLI):
npx supabase db query --project-ref <ref> --file supabase/migrations/0001_init.sql
npx supabase db query --project-ref <ref> --file supabase/seed-demo.sql
npm run build && npm start     # atau: npx next dev
```

Test: `npm run test` (unit+integration), `npm run typecheck`, `npm run build`.

## Alur Bermain

1. Host buka `/create` → dapat kode room 6 karakter + passcode pemulihan
2. Player buka `/join` → masukkan kode + nama
3. Lobby sinkron realtime → host tekan **Mulai**
4. Player mainkan 6 game dari `/player` (maks 100 poin/game, 600 total)
5. Reward terbuka otomatis per game di `/rewards`
6. **Final Letter** terbuka setelah keenam game selesai → `/final-letter`

Host: `/host` (mulai/jeda/urutan/monitor/reset) dan `/editor` (kelola semua konten).

## Keamanan

- Token host/player: CSPRNG 256-bit, disimpan sebagai SHA-256 hash, cookie httpOnly+Secure+SameSite=Lax
- Semua skor & kunci jawaban di server; kunci jawaban tidak pernah dikirim ke client
- Anti-cheat: idempotency key + UNIQUE ledger, Catch My Heart direplay server dari input log (log mustahil → 0)
- Rate limit create/join; pesan error generik (tidak membocorkan keberadaan kode)
- Hasil uji manipulasi: endpoint skor palsu 404, submit dengan field ekstra 400, aksi host via player 403, kode invalid 404, token palsu 401

## Deployment (Vercel + Supabase)

1. Supabase: buat bucket storage `media` (private)
2. Push migrasi & seed (lihat atas)
3. Vercel: import repo, set env: `APP_BASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, `STORAGE_BUCKET=media`, `MAX_UPLOAD_MB=10`
4. Deploy. Tidak ada deploy otomatis dari repo ini.

## Checklist Konten Personal (diisi Host via /editor)

- [ ] 10 soal Love Quiz + respons personal
- [ ] 5 level Escape Room (kode, foto, lagu, pesan, password) + hint
- [ ] 5 foto Memory Lane + jawaban & pesan
- [ ] 9 isi Mystery Box
- [ ] 5 ronde lagu (upload audio via editor API)
- [ ] Parameter Catch My Heart (config games)
- [ ] Teks 5 reward + Final Letter
- [ ] Ganti konten demo → production (content_set kind='production'), uji satu putaran penuh berdua sebelum hari-H
