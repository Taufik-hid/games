import { describe, expect, it } from "vitest";
import { generateRoomCode, normalizeAnswer } from "@/lib/utils";

describe("generateRoomCode", () => {
  it("menghasilkan 6 karakter", () => {
    expect(generateRoomCode()).toHaveLength(6);
  });

  it("tanpa karakter ambigu 0/O/1/I", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateRoomCode()).not.toMatch(/[01OI]/);
    }
  });

  it("deterministik dengan random function ter-inject", () => {
    let i = 0;
    const seq = () => (i++ * 0.13) % 1;
    expect(generateRoomCode(6, seq)).toBe(generateRoomCode(6, seq_reset()));
  });

  function seq_reset() {
    let j = 0;
    return () => (j++ * 0.13) % 1;
  }
});

describe("normalizeAnswer", () => {
  it("lowercase + trim + collapse spasi", () => {
    expect(normalizeAnswer("  Halo   Dunia ")).toBe("halo dunia");
  });
});
