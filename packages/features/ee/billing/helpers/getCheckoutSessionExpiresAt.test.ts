import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { getCheckoutSessionExpiresAt } from "./getCheckoutSessionExpiresAt";

// Mock the constants module to control the expiry minutes for testing
vi.mock("../constants", () => ({
  CHECKOUT_SESSION_EXPIRY_MINUTES: 60,
}));

describe("getCheckoutSessionExpiresAt", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return current timestamp plus expiry minutes in seconds", () => {
    const mockNow = 1672531200000; // Jan 1, 2023 00:00:00 UTC in milliseconds
    vi.setSystemTime(mockNow);

    const result = getCheckoutSessionExpiresAt();

    // Expected: Math.floor(1672531200000 / 1000) + 60 * 60
    // = 1672531200 + 3600 = 1672534800
    expect(result).toBe(1672534800);
  });

  it("should handle fractional milliseconds correctly by flooring", () => {
    const mockNow = 1672531200500; // Jan 1, 2023 00:00:00.500 UTC
    vi.setSystemTime(mockNow);

    const result = getCheckoutSessionExpiresAt();

    // Should floor the milliseconds division
    // Math.floor(1672531200500 / 1000) + 3600 = 1672531200 + 3600
    expect(result).toBe(1672534800);
  });

  it("should return different values for different timestamps", () => {
    // First timestamp
    const mockNow1 = 1672531200000;
    vi.setSystemTime(mockNow1);
    const result1 = getCheckoutSessionExpiresAt();

    // Second timestamp (1 hour later)
    const mockNow2 = 1672534800000;
    vi.setSystemTime(mockNow2);
    const result2 = getCheckoutSessionExpiresAt();

    expect(result2).toBe(result1 + 3600); // 1 hour difference
  });

  it("should consistently add 60 minutes (3600 seconds) to current time", () => {
    const timestamps = [
      1672531200000, // Jan 1, 2023
      1675209600000, // Feb 1, 2023
      1677628800000, // Mar 1, 2023
    ];

    timestamps.forEach((timestamp) => {
      vi.setSystemTime(timestamp);
      const result = getCheckoutSessionExpiresAt();
      const expected = Math.floor(timestamp / 1000) + 60 * 60;
      expect(result).toBe(expected);
    });
  });

  it("should work with edge case timestamps", () => {
    // Test with timestamp 0 (Unix epoch)
    vi.setSystemTime(0);
    const result = getCheckoutSessionExpiresAt();
    expect(result).toBe(3600); // 0 + 3600

    // Test with a large timestamp
    const largeTimestamp = 2147483647000; // Close to 32-bit signed int max
    vi.setSystemTime(largeTimestamp);
    const largeResult = getCheckoutSessionExpiresAt();
    expect(largeResult).toBe(Math.floor(largeTimestamp / 1000) + 3600);
  });

  it("should work correctly when called multiple times rapidly", () => {
    const mockNow = 1672531200000;
    vi.setSystemTime(mockNow);

    const result1 = getCheckoutSessionExpiresAt();
    const result2 = getCheckoutSessionExpiresAt();
    const result3 = getCheckoutSessionExpiresAt();

    // All calls should return the same value when system time is mocked
    expect(result1).toBe(result2);
    expect(result2).toBe(result3);
    expect(result1).toBe(1672534800);
  });
});
