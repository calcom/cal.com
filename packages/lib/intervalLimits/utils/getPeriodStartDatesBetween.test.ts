import dayjs from "@calcom/dayjs";
import { describe, expect, it } from "vitest";
import { getPeriodStartDatesBetween } from "./getPeriodStartDatesBetween";

describe("getPeriodStartDatesBetween", () => {
  it("returns daily start dates between two dates", () => {
    const from = dayjs("2024-06-01T00:00:00Z").utc();
    const to = dayjs("2024-06-03T23:59:59Z").utc();

    const result = getPeriodStartDatesBetween(from, to, "day");

    expect(result).toHaveLength(3);
    expect(result[0].format("YYYY-MM-DD")).toBe("2024-06-01");
    expect(result[1].format("YYYY-MM-DD")).toBe("2024-06-02");
    expect(result[2].format("YYYY-MM-DD")).toBe("2024-06-03");
  });

  it("returns weekly start dates between two dates", () => {
    const from = dayjs("2024-06-01T00:00:00Z").utc();
    const to = dayjs("2024-06-30T23:59:59Z").utc();

    const result = getPeriodStartDatesBetween(from, to, "week");

    expect(result.length).toBeGreaterThanOrEqual(4);
    // Each subsequent date should be 7 days after the previous
    for (let i = 1; i < result.length; i++) {
      expect(result[i].diff(result[i - 1], "day")).toBe(7);
    }
  });

  it("returns monthly start dates between two dates", () => {
    const from = dayjs("2024-01-15T00:00:00Z").utc();
    const to = dayjs("2024-04-15T23:59:59Z").utc();

    const result = getPeriodStartDatesBetween(from, to, "month");

    expect(result).toHaveLength(4);
    expect(result[0].format("YYYY-MM")).toBe("2024-01");
    expect(result[1].format("YYYY-MM")).toBe("2024-02");
    expect(result[2].format("YYYY-MM")).toBe("2024-03");
    expect(result[3].format("YYYY-MM")).toBe("2024-04");
  });

  it("returns yearly start dates", () => {
    const from = dayjs("2022-06-01T00:00:00Z").utc();
    const to = dayjs("2024-06-01T23:59:59Z").utc();

    const result = getPeriodStartDatesBetween(from, to, "year");

    expect(result).toHaveLength(3);
    expect(result[0].format("YYYY")).toBe("2022");
    expect(result[1].format("YYYY")).toBe("2023");
    expect(result[2].format("YYYY")).toBe("2024");
  });

  it("returns a single date when from and to are the same day", () => {
    const from = dayjs("2024-06-15T00:00:00Z").utc();
    const to = dayjs("2024-06-15T23:59:59Z").utc();

    const result = getPeriodStartDatesBetween(from, to, "day");

    expect(result).toHaveLength(1);
  });

  it("respects timezone parameter", () => {
    const from = dayjs("2024-06-01T00:00:00Z").utc();
    const to = dayjs("2024-06-03T23:59:59Z").utc();

    const result = getPeriodStartDatesBetween(from, to, "day", "America/New_York");

    expect(result.length).toBeGreaterThanOrEqual(3);
  });
});
