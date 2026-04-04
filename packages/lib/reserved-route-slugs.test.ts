import { describe, expect, test } from "vitest";

import { isReservedRouteSlug, RESERVED_ROUTE_SLUGS } from "./reserved-route-slugs";

describe("reserved-route-slugs", () => {
  describe("isReservedRouteSlug", () => {
    test("returns true for app route 'team'", () => {
      expect(isReservedRouteSlug("team")).toBe(true);
    });

    test("returns true for app route 'booking'", () => {
      expect(isReservedRouteSlug("booking")).toBe(true);
    });

    test("returns true for short app route 'd'", () => {
      expect(isReservedRouteSlug("d")).toBe(true);
    });

    test("returns true for virtual route 'forms'", () => {
      expect(isReservedRouteSlug("forms")).toBe(true);
    });

    test("returns false for normal username", () => {
      expect(isReservedRouteSlug("myusername")).toBe(false);
    });

    test("is case-insensitive", () => {
      expect(isReservedRouteSlug("Team")).toBe(true);
      expect(isReservedRouteSlug("BOOKING")).toBe(true);
      expect(isReservedRouteSlug("Settings")).toBe(true);
    });
  });

  describe("RESERVED_ROUTE_SLUGS", () => {
    test("contains expected app routes", () => {
      expect(RESERVED_ROUTE_SLUGS).toContain("team");
      expect(RESERVED_ROUTE_SLUGS).toContain("booking");
      expect(RESERVED_ROUTE_SLUGS).toContain("settings");
      expect(RESERVED_ROUTE_SLUGS).toContain("apps");
    });

    test("contains virtual routes", () => {
      expect(RESERVED_ROUTE_SLUGS).toContain("forms");
      expect(RESERVED_ROUTE_SLUGS).toContain("router");
      expect(RESERVED_ROUTE_SLUGS).toContain("success");
      expect(RESERVED_ROUTE_SLUGS).toContain("cancel");
      expect(RESERVED_ROUTE_SLUGS).toContain("app");
    });

    test("does not contain whitelisted routes", () => {
      expect(RESERVED_ROUTE_SLUGS).not.toContain("onboarding");
    });
  });
});
