export function clsx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // tanpa 0/O/1/I

export function generateRoomCode(len = 6, random: (n: number) => number = (n) => Math.floor(Math.random() * n)): string {
  let out = "";
  for (let i = 0; i < len; i++) out += ROOM_ALPHABET[random(ROOM_ALPHABET.length)];
  return out;
}

export function normalizeAnswer(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}
