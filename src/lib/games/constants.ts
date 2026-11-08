export const GAME_SLUGS = [
  "love-quiz",
  "love-escape-room",
  "memory-lane",
  "mystery-box",
  "guess-the-song",
  "catch-my-heart",
] as const;

export type GameSlug = (typeof GAME_SLUGS)[number];

export const GAME_TITLES: Record<GameSlug, string> = {
  "love-quiz": "Love Quiz",
  "love-escape-room": "Love Escape Room",
  "memory-lane": "Memory Lane",
  "mystery-box": "Mystery Box",
  "guess-the-song": "Guess the Song",
  "catch-my-heart": "Catch My Heart",
};

export const MAX_POINTS_PER_GAME = 100;
export const MAX_TOTAL_POINTS = 600;
