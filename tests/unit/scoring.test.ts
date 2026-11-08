import { describe, expect, it } from "vitest";
import { quizScore, escapeLevelScore, memoryLaneScore, mysteryBoxScore, catchHeartScore } from "@/lib/scoring";

describe("perhitungan skor per game (unit)", () => {
  it("Love Quiz: round(100*benar/total)", () => {
    expect(quizScore(10, 10)).toBe(100);
    expect(quizScore(0, 10)).toBe(0);
    expect(quizScore(7, 10)).toBe(70);
    expect(quizScore(5, 6)).toBe(83);
    expect(quizScore(3, 0)).toBe(0);
  });

  it("Escape Room: 20 - 5*hint, min 0", () => {
    expect(escapeLevelScore(0)).toBe(20);
    expect(escapeLevelScore(1)).toBe(15);
    expect(escapeLevelScore(2)).toBe(10);
    expect(escapeLevelScore(4)).toBe(0);
    expect(escapeLevelScore(-1)).toBe(20);
  });

  it("Memory Lane: attempt1=20, attempt2=10, lainnya 0", () => {
    expect(memoryLaneScore(1)).toBe(20);
    expect(memoryLaneScore(2)).toBe(10);
    expect(memoryLaneScore(3)).toBe(0);
    expect(memoryLaneScore(10)).toBe(0);
  });

  it("Mystery Box: 1-8=11, 9=12 (total 9 kotak = 100)", () => {
    let total = 0;
    for (let i = 1; i <= 9; i++) total += mysteryBoxScore(i);
    expect(total).toBe(100);
    expect(mysteryBoxScore(1)).toBe(11);
    expect(mysteryBoxScore(9)).toBe(12);
  });

  it("Catch My Heart: min(100, round(raw*100/target))", () => {
    expect(catchHeartScore(50, 50)).toBe(100);
    expect(catchHeartScore(100, 50)).toBe(100); // tidak bisa lewat 100
    expect(catchHeartScore(25, 50)).toBe(50);
    expect(catchHeartScore(0, 50)).toBe(0);
    expect(catchHeartScore(10, 0)).toBe(0);
  });
});
