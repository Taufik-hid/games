import Link from "next/link";

export default function Landing() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="text-6xl">💌</div>
      <h1 className="text-3xl font-bold text-pink-600">HER DAY ARCADE</h1>
      <p className="text-pink-500">Petualangan ulang tahun untuk dua orang — enam game, 600 Love Points, dan satu surat spesial di akhir.</p>
      <div className="mt-4 flex w-full flex-col gap-3">
        <Link href="/create" className="scrapbook-card w-full py-4 font-semibold text-pink-600">
          🎀 Buat Room (Host)
        </Link>
        <Link href="/join" className="scrapbook-card w-full py-4 font-semibold text-pink-600">
          💌 Join Room (Birthday Player)
        </Link>
        <Link href="/lobby" className="py-3 text-sm text-pink-400 underline">
          Lanjutkan sesi
        </Link>
      </div>
      <p className="mt-6 text-xs text-pink-300">Dibuat dengan 💖 • mobile-first • bermain berdua lewat HP masing-masing</p>
    </main>
  );
}
