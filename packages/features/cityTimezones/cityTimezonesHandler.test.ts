import { describe, expect, test, vitest } from "vitest";

import { cityTimezonesHandler } from "./cityTimezonesHandler";

describe("cityTimezonesHandler", () => {
  test("should fetch city timezones from CDN URL", async () => {
    const mockFetch = vitest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { city: "New York", timezone: "America/New_York", pop: 1000 },
        { city: "London", timezone: "Europe/London", pop: 2000 },
      ],
    });

    global.fetch = mockFetch;

    const result = await cityTimezonesHandler();

    expect(result).toEqual([
      { city: "New York", timezone: "America/New_York", pop: 1000 },
      { city: "London", timezone: "Europe/London", pop: 2000 },
    ]);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://cdn.jsdelivr.net/npm/city-timezones@1.2.1/data/cityMap.json"
    );
  });

  test("should throw an error if fetch fails", async () => {
    const mockFetch = vitest.fn().mockRejectedValue(new Error("Failed to fetch city map"));

    global.fetch = mockFetch;

    await expect(cityTimezonesHandler()).rejects.toThrowError("Failed to fetch city map");
  });

  test("should handle Londonderry -> London replacement", async () => {
    const mockFetch = vitest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { city: "Londonderry", timezone: "Europe/London", pop: 1000 },
        { city: "New York", timezone: "America/New_York", pop: 2000 },
      ],
    });

    global.fetch = mockFetch;

    const result = await cityTimezonesHandler();

    expect(result).toEqual([
      { city: "London", timezone: "Europe/London", pop: 1000 },
      { city: "New York", timezone: "America/New_York", pop: 2000 },
    ]);
  });

  test("should dedupe cities by name and keep the one with the highest population", async () => {
    const mockFetch = vitest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { city: "New York", timezone: "America/New_York", pop: 1000 },
        { city: "New York", timezone: "America/New_York", pop: 2000 },
        { city: "London", timezone: "Europe/London", pop: 3000 },
      ],
    });

    global.fetch = mockFetch;

    const result = await cityTimezonesHandler();

    expect(result).toEqual([
      { city: "New York", timezone: "America/New_York", pop: 2000 },
      { city: "London", timezone: "Europe/London", pop: 3000 },
    ]);
  });
});
