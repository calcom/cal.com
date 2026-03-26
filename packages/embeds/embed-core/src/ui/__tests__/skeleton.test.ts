import { afterEach, describe, expect, it, vi } from "vitest";
import { generateSkeleton } from "../skeleton";

describe("generateSkeleton", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns skeleton HTML when pageType is null", () => {
    const result = generateSkeleton({ layout: "month_view", pageType: null });
    expect(result).toContain('data-testid="booker-container"');
    expect(result).toContain('data-testid="event-meta"');
  });

  it("returns skeleton HTML for user.event.booking.slots pageType", () => {
    const result = generateSkeleton({ layout: "month_view", pageType: "user.event.booking.slots" });
    expect(result).toContain('data-testid="booker-container"');
  });

  it("returns skeleton HTML for team.event.booking.slots pageType", () => {
    const result = generateSkeleton({ layout: "month_view", pageType: "team.event.booking.slots" });
    expect(result).toContain('data-testid="booker-container"');
  });

  it("generates leading empty cells when month does not start on week start day", () => {
    // 2024-02-01 is a Thursday (day 4), so leadingEmptyCells = (4 - 0 + 7) % 7 = 4
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-02-15T12:00:00Z"));

    const result = generateSkeleton({ layout: "month_view", pageType: "user.event.booking.slots" });

    // Count leading empty cells (divs with only pt-[100%] class, before the button-containing divs)
    const emptyDivPattern = /<div class="relative w-full pt-\[100%\]"><\/div>/g;
    const buttonDivPattern = /<div class="relative w-full pt-\[100%\]">\s*<button/g;
    const allEmptyDivs = result.match(emptyDivPattern) || [];
    const filledDivs = result.match(buttonDivPattern) || [];

    // February 2024 has 29 days, starts on Thursday (4 leading empty cells)
    // trailing = 42 - 4 - 29 = 9
    // Total empty = 4 + 9 = 13
    expect(allEmptyDivs.length).toBe(13);
    expect(filledDivs.length).toBe(29);
  });

  it("returns mobile layout skeleton when layout is mobile", () => {
    const result = generateSkeleton({ layout: "mobile", pageType: "user.event.booking.slots" });
    expect(result).toContain('data-testid="booker-container"');
    // Mobile layout has the date picker inside meta section
    expect(result).toContain("mt-auto px-5 py-3");
  });
});
