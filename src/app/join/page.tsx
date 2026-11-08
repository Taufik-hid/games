"use client";

import { FormEvent, useState } from "react";
import { Button, Card, Toast } from "@/components/ui";

export default function JoinRoomPage() {
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "join", code: code.toUpperCase(), displayName }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Gagal join room");
      return;
    }
    window.location.href = "/lobby";
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6">
      <h1 className="text-center text-2xl font-bold text-pink-600">Join Room 💌</h1>
      <Card>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="text-sm font-medium">
            Kode Room (6 karakter)
            <input
              className="mt-1 w-full rounded-xl border border-pink-200 px-4 py-3 text-center font-mono text-2xl font-bold uppercase tracking-widest outline-none focus:border-pink-400"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              maxLength={6}
              minLength={6}
              placeholder="ABC234"
            />
          </label>
          <label className="text-sm font-medium">
            Nama tampilan
            <input
              className="mt-1 w-full rounded-xl border border-pink-200 px-4 py-3 outline-none focus:border-pink-400"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              maxLength={40}
              placeholder="mis. Tersayang"
            />
          </label>
          {error && <Toast message={error} tone="error" />}
          <Button type="submit" disabled={busy || code.length !== 6 || !displayName.trim()}>
            {busy ? "Joining…" : "Join 💖"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
