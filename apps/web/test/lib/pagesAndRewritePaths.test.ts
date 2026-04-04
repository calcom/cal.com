import { it, expect, describe } from "vitest";

import { APP_RESERVED_ROUTE_SLUGS } from "@calcom/lib/generated/app-reserved-route-slugs.generated";
import { RESERVED_ROUTE_SLUGS } from "@calcom/lib/reserved-route-slugs";

import {
  topLevelRoutesExcludedFromOrgRewrite,
  topLevelRouteNamesWhitelistedForRewrite,
} from "../../pagesAndRewritePaths.js";

describe("pagesAndRewritePaths", () => {
  describe("beforeFiles must exclude top-level routes in pages/app router", () => {
    const ROUTES_EXCLUDED_FROM_ORG_REWRITE = [
      "apps",
      "availability",
      "booking",
      "connect-and-join",
      "enterprise",
      "error",
      "getting-started",
      "insights",
      "maintenance",
      "more",
      "not-found",
      "reschedule",
      "settings",
      "teams",
      "upgrade",
      "video",
      "workflows",
      "bookings",
      "event-types",
      "icons",
      "org",
      "payment",
      "routing-forms",
      "signup",
      "team",
      "d",
    ];

    it("should include all required top-level route names", () => {
      ROUTES_EXCLUDED_FROM_ORG_REWRITE.forEach((route) => {
        expect(topLevelRoutesExcludedFromOrgRewrite).toContain(route);
      });
    });

    it("should NOT include whitelisted routes", () => {
      topLevelRouteNamesWhitelistedForRewrite.forEach((route) => {
        expect(topLevelRoutesExcludedFromOrgRewrite).not.toContain(route);
      });
    });
  });

  describe("Generated APP_RESERVED_ROUTE_SLUGS must stay in sync with filesystem routes", () => {
    it("should contain every route from topLevelRoutesExcludedFromOrgRewrite", () => {
      const generatedLower = APP_RESERVED_ROUTE_SLUGS.map((s) => s.toLowerCase());
      topLevelRoutesExcludedFromOrgRewrite.forEach((route) => {
        expect(
          generatedLower,
          `Missing "${route}" in generated APP_RESERVED_ROUTE_SLUGS. Run 'yarn generate:app-reserved-slugs' to update.`
        ).toContain(route.toLowerCase());
      });
    });

    it("should contain virtual routes used in rewrites", () => {
      const virtualRoutes = ["forms", "router", "success", "cancel", "app"];
      virtualRoutes.forEach((route) => {
        expect(
          APP_RESERVED_ROUTE_SLUGS,
          `Missing virtual route "${route}" in generated APP_RESERVED_ROUTE_SLUGS. Run 'yarn generate:app-reserved-slugs' to update.`
        ).toContain(route);
      });
    });

    it("should be included in RESERVED_ROUTE_SLUGS", () => {
      APP_RESERVED_ROUTE_SLUGS.forEach((route) => {
        expect(RESERVED_ROUTE_SLUGS).toContain(route);
      });
    });
  });
});
