import { it, expect, describe, beforeAll } from "vitest";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getSubdomainRegExp } = require("../../getSubdomainRegExp");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { match, pathToRegexp } = require("next/dist/compiled/path-to-regexp");
type MatcherRes = (path: string) => { params: Record<string, string> };
let orgUserTypeRouteMatch: MatcherRes;
let orgUserRouteMatch: MatcherRes;

beforeAll(async () => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  process.env.NEXT_PUBLIC_WEBAPP_URL = "http://example.com";
  const {
    orgUserRoutePath,
    orgUserTypeRoutePath,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
  } = require("../../pagesAndRewritePaths");

  orgUserTypeRouteMatch = match(orgUserTypeRoutePath);

  orgUserRouteMatch = match(orgUserRoutePath);
  console.log({
    regExps: {
      orgUserTypeRouteMatch: pathToRegexp(orgUserTypeRoutePath),
      orgUserRouteMatch: pathToRegexp(orgUserRoutePath),
    },
  });
});

describe("next.config.js - Org Rewrite", () => {
  const orgHostRegExp = (subdomainRegExp: string) =>
    // RegExp copied from pagesAndRewritePaths.js orgHostPath. Do make the change there as well.
    new RegExp(`^(?<orgSlug>${subdomainRegExp})\\.(?!vercel\.app).*`);

  describe("Host matching based on NEXT_PUBLIC_WEBAPP_URL", () => {
    it("https://app.cal.com", () => {
      const subdomainRegExp = getSubdomainRegExp("https://app.cal.com");
      expect(orgHostRegExp(subdomainRegExp).exec("app.cal.com")).toEqual(null);
      expect(orgHostRegExp(subdomainRegExp).exec("company.app.cal.com")?.groups?.orgSlug).toEqual("company");
      expect(orgHostRegExp(subdomainRegExp).exec("org.cal.com")?.groups?.orgSlug).toEqual("org");

      expect(orgHostRegExp(subdomainRegExp).exec("localhost:3000")).toEqual(null);
    });

    it("app.cal.com", () => {
      const subdomainRegExp = getSubdomainRegExp("app.cal.com");
      expect(orgHostRegExp(subdomainRegExp).exec("app.cal.com")).toEqual(null);
      expect(orgHostRegExp(subdomainRegExp).exec("company.app.cal.com")?.groups?.orgSlug).toEqual("company");
    });

    it("https://calcom.app.company.com", () => {
      const subdomainRegExp = getSubdomainRegExp("https://calcom.app.company.com");
      expect(orgHostRegExp(subdomainRegExp).exec("calcom.app.company.com")).toEqual(null);
      expect(orgHostRegExp(subdomainRegExp).exec("acme.calcom.app.company.com")?.groups?.orgSlug).toEqual(
        "acme"
      );
    });

    it("https://calcom.example.com", () => {
      const subdomainRegExp = getSubdomainRegExp("https://calcom.example.com");
      expect(orgHostRegExp(subdomainRegExp).exec("calcom.example.com")).toEqual(null);
      expect(orgHostRegExp(subdomainRegExp).exec("acme.calcom.example.com")?.groups?.orgSlug).toEqual("acme");
      // The following also matches which causes anything other than the domain in NEXT_PUBLIC_WEBAPP_URL to give 404
      expect(orgHostRegExp(subdomainRegExp).exec("some-other.company.com")?.groups?.orgSlug).toEqual(
        "some-other"
      );
    });
    it("Should ignore Vercel preview URLs", () => {
      const subdomainRegExp = getSubdomainRegExp("https://cal-xxxxxxxx-cal.vercel.app");
      expect(
        orgHostRegExp(subdomainRegExp).exec("https://cal-xxxxxxxx-cal.vercel.app")
      ).toMatchInlineSnapshot("null");
      expect(orgHostRegExp(subdomainRegExp).exec("cal-xxxxxxxx-cal.vercel.app")).toMatchInlineSnapshot(
        "null"
      );
    });
  });

  describe("Rewrite", () => {
    it("booking pages", () => {
      expect(orgUserTypeRouteMatch("/user/type")?.params).toContain({
        user: "user",
        type: "type",
      });

      // User slug starting with 404(which is a page route) will work
      expect(orgUserTypeRouteMatch("/404a/def")?.params).toEqual({
        user: "404a",
        type: "def",
      });

      // Team Page won't match - There is no /team prefix required for Org team event pages
      expect(orgUserTypeRouteMatch("/team/abc")).toEqual(false);

      expect(orgUserTypeRouteMatch("/abc")).toEqual(false);

      expect(orgUserRouteMatch("/abc")?.params).toContain({
        user: "abc",
      });

      // Tests that something that starts with 'd' which could accidentally match /d route is correctly identified as a booking page
      expect(orgUserRouteMatch("/designer")?.params).toContain({
        user: "designer",
      });

      // Tests that something that starts with 'apps' which could accidentally match /apps route is correctly identified as a booking page
      expect(orgUserRouteMatch("/apps-conflict-possibility")?.params).toContain({
        user: "apps-conflict-possibility",
      });

      // Tests that something that starts with '_next' which could accidentally match /_next route is correctly identified as a booking page
      expect(orgUserRouteMatch("/_next-candidate")?.params).toContain({
        user: "_next-candidate",
      });

      // Tests that something that starts with 'public' which could accidentally match /public route is correctly identified as a booking page
      expect(orgUserRouteMatch("/public-person")?.params).toContain({
        user: "public-person",
      });
    });

    it("Non booking pages", () => {
      expect(orgUserTypeRouteMatch("/_next/def")).toEqual(false);
      expect(orgUserTypeRouteMatch("/public/def")).toEqual(false);

      expect(orgUserRouteMatch("/_next/")).toEqual(false);
      expect(orgUserRouteMatch("/public/")).toEqual(false);

      expect(orgUserRouteMatch("/event-types/")).toEqual(false);
      expect(orgUserTypeRouteMatch("/event-types/")).toEqual(false);

      expect(orgUserRouteMatch("/event-types/?abc=1")).toEqual(false);
      expect(orgUserTypeRouteMatch("/event-types/?abc=1")).toEqual(false);

      expect(orgUserRouteMatch("/event-types")).toEqual(false);
      expect(orgUserTypeRouteMatch("/event-types")).toEqual(false);

      expect(orgUserRouteMatch("/event-types?abc=1")).toEqual(false);
      expect(orgUserTypeRouteMatch("/event-types?abc=1")).toEqual(false);

      expect(orgUserTypeRouteMatch("/john/avatar.png")).toEqual(false);
      expect(orgUserTypeRouteMatch("/cancel/abcd")).toEqual(false);
      expect(orgUserTypeRouteMatch("/success/abcd")).toEqual(false);
      expect(orgUserRouteMatch("/forms/xdsdf-sd")).toEqual(false);
      expect(orgUserRouteMatch("/router?form=")).toEqual(false);
    });
  });
});
