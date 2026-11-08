"use client";

import { FormEvent, useState } from "react";
import { Button, Card, Toast } from "@/components/ui";

export default function CreateRoomPage() {
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ code: string; passcode: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "create", displayName }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Gagal membuat room");
      return;
    }
    setCreated({ code: data.code, passcode: data.passcode });
    setTimeout(() => (window.location.href = "/lobby"), 2500);
  }

  if (created) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6">
        <Card className="text-center">
          <h1 className="text-xl font-bold text-pink-600">Room dibuat! 🎀</h1>
          <p className="mt-3 text-sm text-pink-400">Kode Room</p>
          <p className="font-mono text-4xl font-bold tracking-widest text-pink-600">{created.code}</p>
          <p className="mt-3 text-sm text-pink-400">Passcode pemulihan host (simpan!)</p>
          <p className="font-mono text-2xl font-bold">{created.passcode}</p>
          <p className="mt-3 animate-pulse text-xs text-pink-400">Mengarahkan ke lobby…</p>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6">
      <h1 className="text-center text-2xl font-bold text-pink-600">Buat Room 💗</h1>
      <Card>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="text-sm font-medium">
            Nama tampilan (host)
            <input
              className="mt-1 w-full rounded-xl border border-pink-200 px-4 py-3 outline-none focus:border-pink-400"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              maxLength={40}
              placeholder="mis. Host"
            />
          </label>
          {error && <Toast message={error} tone="error" />}
          <Button type="submit" disabled={busy || !displayName.trim()}>
            {busy ? "Membuat…" : "Buat Room"}
          </Button>
        </form>
      </Card>
      <p className="text-center text-sm text-pink-400">
        Sudah punya kode? <a className="underline" href="/join">Join di sini</a>
      </p>
    </main>
  );
}
