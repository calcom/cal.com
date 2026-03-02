import { describe, it, expect } from "vitest";

import { calculateDeltaType } from "./calculateDeltaType";

describe("calculateDeltaType", () => {
  describe("increase", () => {
    it("should return 'increase' for delta > 10", () => {
      expect(calculateDeltaType(11)).toBe("increase");
      expect(calculateDeltaType(50)).toBe("increase");
      expect(calculateDeltaType(100)).toBe("increase");
    });

    it("should return 'moderateIncrease' for delta > 0 and <= 10", () => {
      expect(calculateDeltaType(1)).toBe("moderateIncrease");
      expect(calculateDeltaType(5)).toBe("moderateIncrease");
      expect(calculateDeltaType(10)).toBe("moderateIncrease");
    });
  });

  describe("decrease", () => {
    it("should return 'decrease' for delta < -10", () => {
      expect(calculateDeltaType(-11)).toBe("decrease");
      expect(calculateDeltaType(-50)).toBe("decrease");
      expect(calculateDeltaType(-100)).toBe("decrease");
    });

    it("should return 'moderateDecrease' for delta < 0 and >= -10", () => {
      expect(calculateDeltaType(-1)).toBe("moderateDecrease");
      expect(calculateDeltaType(-5)).toBe("moderateDecrease");
      expect(calculateDeltaType(-10)).toBe("moderateDecrease");
    });
  });

  describe("unchanged", () => {
    it("should return 'unchanged' for delta === 0", () => {
      expect(calculateDeltaType(0)).toBe("unchanged");
    });
  });

  describe("boundary values", () => {
    it("should return 'moderateIncrease' for delta exactly 10", () => {
      expect(calculateDeltaType(10)).toBe("moderateIncrease");
    });

    it("should return 'increase' for delta exactly 11", () => {
      expect(calculateDeltaType(11)).toBe("increase");
    });

    it("should return 'moderateDecrease' for delta exactly -10", () => {
      expect(calculateDeltaType(-10)).toBe("moderateDecrease");
    });

    it("should return 'decrease' for delta exactly -11", () => {
      expect(calculateDeltaType(-11)).toBe("decrease");
    });

    it("should handle very small positive delta", () => {
      expect(calculateDeltaType(0.1)).toBe("moderateIncrease");
    });

    it("should handle very small negative delta", () => {
      expect(calculateDeltaType(-0.1)).toBe("moderateDecrease");
    });
  });
});
