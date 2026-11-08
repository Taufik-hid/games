import { describe, expect, it } from "vitest";
import { GAME_SLUGS, MAX_POINTS_PER_GAME, MAX_TOTAL_POINTS } from "@/lib/games/constants";

describe("constants", () => {
  it("enam game", () => expect(GAME_SLUGS).toHaveLength(6));
  it("batas poin 100 per game / 600 total", () => {
    expect(MAX_POINTS_PER_GAME).toBe(100);
    expect(MAX_TOTAL_POINTS).toBe(600);
  });
});
