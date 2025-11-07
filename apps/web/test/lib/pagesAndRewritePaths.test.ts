import { it, expect, describe } from "vitest";

import { pages } from "../../pagesAndRewritePaths.js";

describe("pagesAndRewritePaths", () => {
  describe("beforeFiles must exclude routes in pages/app router", () => {
    const BEFORE_REWRITE_EXCLUDE_PAGES = [
      "booking",
      "booking-successful",
      "error",
      "not-found",
      "reschedule",
      "icons",
      "org",
      "routing-forms",
      "team",
      "d",
      "api",
      "cache",
    ];

    it("should include all required routes", () => {
      BEFORE_REWRITE_EXCLUDE_PAGES.forEach((route) => {
        expect(pages).toContain(route);
      });
    });
  });

  describe("Top-level app routes must be reserved (not treated as booking pages)", () => {
    const TOP_LEVEL_APP_ROUTES = [
      "api",
      "icons",
      "cache",
      "routing-forms",
      "reschedule",
      "error",
      "not-found",
    ];

    it("should include top-level app routes to prevent them from being treated as user slugs on org domains", () => {
      TOP_LEVEL_APP_ROUTES.forEach((route) => {
        expect(
          pages,
          `Top-level app route '${route}' must be in pages array to prevent /acme.cal.com/${route} from being treated as a booking page`
        ).toContain(route);
      });
    });
  });

  describe("Only booking routes should be excluded from org rewrites", () => {
    const BOOKING_ROUTES = [
      "booking",
      "booking-successful",
      "d",
      "org",
      "team",
    ];

    const NON_BOOKING_ROUTES = [
      "onboarding",
      "settings",
      "event-types",
      "availability",
      "apps",
      "workflows",
      "insights",
      "bookings",
      "teams",
      "video",
      "getting-started",
      "payment",
      "signup",
      "enterprise",
      "connect-and-join",
      "maintenance",
      "more",
      "upgrade",
      "refer",
      "auth",
    ];

    it("should include booking routes from (booking-page-wrapper)", () => {
      BOOKING_ROUTES.forEach((route) => {
        expect(pages, `Expected booking route '${route}' to be in pages array`).toContain(route);
      });
    });

    it("should NOT include non-booking routes from (use-page-wrapper)", () => {
      NON_BOOKING_ROUTES.forEach((route) => {
        expect(pages, `Non-booking route '${route}' should NOT be in pages array to allow org domain rewrites`).not.toContain(route);
      });
    });
  });
});
