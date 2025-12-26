import { it, expect, describe, beforeAll } from "vitest";

import { getRegExpThatMatchesAllOrgDomains } from "../../getNextjsOrgRewriteConfig";

/* eslint-disable @typescript-eslint/no-require-imports */
const { match, pathToRegexp } = require("next/dist/compiled/path-to-regexp");
type MatcherRes = (path: string) => { params: Record<string, string> };
let orgUserTypeRouteMatch: MatcherRes;
let orgUserRouteMatch: MatcherRes;

beforeAll(async () => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  process.env.NEXT_PUBLIC_WEBAPP_URL = "http://example.com";
  const { orgUserRoutePath, orgUserTypeRoutePath } = await import("../../pagesAndRewritePaths");

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
  describe("getRegExpThatMatchesAllOrgDomains", () => {
    it("WEBAPP_URL=app.cal.com", () => {
      const regExp = new RegExp(getRegExpThatMatchesAllOrgDomains({ webAppUrl: "app.cal.com" }));
      expect(regExp.exec("acme.cal.com")?.groups?.orgSlug).toEqual("acme");
      expect(regExp.exec("app.cal.com")).toEqual(null);
      // Even though it matches abc. We shouldn't match it as it isn't a subdomain of cal.com(derived from WEBAPP_URL)
      // We could fix the RegExp, but that might break some unexpected self-hosted scenarios. So, we can fix it separately.
      expect(regExp.exec("abc.sdafasdf.com")?.groups?.orgSlug).toEqual("abc");
    });

    it("WEBAPP_URL=https://app.cal.com", () => {
      const regExp = new RegExp(getRegExpThatMatchesAllOrgDomains({ webAppUrl: "https://app.cal.com" }));
      expect(regExp.exec("acme.cal.com")?.groups?.orgSlug).toEqual("acme");
      expect(regExp.exec("app.cal.com")).toEqual(null);

      // This approach though not used by managed cal.com, but might be in use by self-hosted users.
      expect(regExp.exec("acme.app.cal.com")?.groups?.orgSlug).toEqual("acme");

      // TODO: Even though it gives abc orgSlug. We shouldn't match it as it isn't a subdomain of cal.com(derived from WEBAPP_URL)
      // We could fix the RegExp, but that might break some unexpected self-hosted scenarios. So, we can fix it separately.
      expect(regExp.exec("abc.sdafasdf.com")?.groups?.orgSlug).toEqual("abc");
    });

    it("WEBAPP_URL=https://booker.dashboard.company.com", () => {
      const regExp = new RegExp(
        getRegExpThatMatchesAllOrgDomains({ webAppUrl: "https://booker.dashboard.company.com" })
      );

      // This approach though not used by managed cal.com, but might be in use by self-hosted users.
      expect(regExp.exec("acme.booker.dashboard.company.com")?.groups?.orgSlug).toEqual("acme");
      expect(regExp.exec("booker.dashboard.company.com")).toEqual(null);
    });

    it("WEBAPP_URL=http://app.cal.local:3000", () => {
      const regExp = new RegExp(
        getRegExpThatMatchesAllOrgDomains({ webAppUrl: "http://app.cal.local:3000" })
      );
      expect(regExp.exec("acme.cal.local:3000")?.groups?.orgSlug).toEqual("acme");
      expect(regExp.exec("acme.app.cal.local:3000")?.groups?.orgSlug).toEqual("acme");
      expect(regExp.exec("app.cal.local:3000")).toEqual(null);
    });

    it("Vercel Preview special handling - vercel.app. Cal.com deployed on vercel apps have different subdomains, so we can't consider them org domains", () => {
      const regExp = new RegExp(getRegExpThatMatchesAllOrgDomains({ webAppUrl: "http://app.vercel.app" }));
      // It is not matching on vercel.app but would have matched in any other case
      expect(regExp.exec("acme.vercel.app")).toEqual(null);
      expect(regExp.exec("app.vercel.app")).toEqual(null);
    });

    describe("NEXT_PUBLIC_SINGLE_ORG_MODE_ENABLED=1", () => {
      process.env.NEXT_PUBLIC_SINGLE_ORG_MODE_ENABLED = "1";
      it("WEBAPP_URL=http://app.cal.local:3000", () => {
        const regExp = new RegExp(
          getRegExpThatMatchesAllOrgDomains({ webAppUrl: "http://app.cal.local:3000" })
        );
        expect(regExp.exec("acme.cal.local:3000")?.groups?.orgSlug).toEqual("acme");
        expect(regExp.exec("app.cal.local:3000")).toEqual(null);
      });
    });
  });

  describe("Rewrite", () => {
    it("Booking pages", () => {
      expect(orgUserTypeRouteMatch("/user/type")?.params).toEqual({
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

      expect(orgUserRouteMatch("/abc")?.params).toEqual({
        user: "abc",
      });

      // Tests that something that starts with 'd' which could accidentally match /d route is correctly identified as a booking page
      expect(orgUserRouteMatch("/designer")?.params).toEqual({
        user: "designer",
      });

      // Tests that something that starts with 'apps' which could accidentally match /apps route is correctly identified as a booking page
      expect(orgUserRouteMatch("/apps-conflict-possibility")?.params).toEqual({
        user: "apps-conflict-possibility",
      });

      // Tests that something that starts with '_next' which could accidentally match /_next route is correctly identified as a booking page
      expect(orgUserRouteMatch("/_next-candidate")?.params).toEqual({
        user: "_next-candidate",
      });

      // Tests that something that starts with 'public' which could accidentally match /public route is correctly identified as a booking page
      expect(orgUserRouteMatch("/public-person")?.params).toEqual({
        user: "public-person",
      });
    });

    it("Non booking pages", () => {
      expect(orgUserTypeRouteMatch("/_next/def")).toEqual(false);
      expect(orgUserTypeRouteMatch("/public/def")).toEqual(false);
      expect(orgUserRouteMatch("/embed.js")).toEqual(false);
      expect(orgUserTypeRouteMatch("/embed/embed.js")).toEqual(false);
      expect(orgUserTypeRouteMatch("/embed/preview.html")).toEqual(false);

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

    it("Whitelisted routes should match on org domains", () => {
      expect(orgUserRouteMatch("/onboarding")?.params).toEqual({
        user: "onboarding",
      });
      expect(orgUserTypeRouteMatch("/onboarding/30min")?.params).toEqual({
        user: "onboarding",
        type: "30min",
      });
    });

    describe("Character validation in org slugs", () => {
      it("should allow valid characters: alphanumeric, hyphens, and underscores", () => {
        // Valid usernames with allowed characters
        expect(orgUserRouteMatch("/john-doe")?.params).toEqual({
          user: "john-doe",
        });
        expect(orgUserRouteMatch("/john_doe")?.params).toEqual({
          user: "john_doe",
        });
        expect(orgUserRouteMatch("/user123")?.params).toEqual({
          user: "user123",
        });
        expect(orgUserRouteMatch("/ABC-123_xyz")?.params).toEqual({
          user: "ABC-123_xyz",
        });
      });

      it("should reject invalid punctuation characters in org slugs", () => {
        // These should NOT match because they contain invalid characters
        // The character class [a-zA-Z0-9-_] when hyphen is unescaped between 9 and _
        // creates a range from - (ASCII 45) to _ (ASCII 95), which includes : ; < = > ? @ [ \ ] ^

        // Colon (:) - ASCII 58
        expect(orgUserRouteMatch("/user:name")).toEqual(false);

        // Semicolon (;) - ASCII 59
        expect(orgUserRouteMatch("/user;name")).toEqual(false);

        // Less than (<) - ASCII 60
        expect(orgUserRouteMatch("/user<name")).toEqual(false);

        // Equals (=) - ASCII 61
        expect(orgUserRouteMatch("/user=name")).toEqual(false);

        // Greater than (>) - ASCII 62
        expect(orgUserRouteMatch("/user>name")).toEqual(false);

        // Question mark (?) - ASCII 63
        expect(orgUserRouteMatch("/user?name")).toEqual(false);

        // At symbol (@) - ASCII 64
        expect(orgUserRouteMatch("/user@name")).toEqual(false);

        // Square brackets ([, ]) - ASCII 91, 93
        expect(orgUserRouteMatch("/user[name")).toEqual(false);
        expect(orgUserRouteMatch("/user]name")).toEqual(false);

        // Backslash (\) - ASCII 92
        expect(orgUserRouteMatch("/user\\name")).toEqual(false);

        // Caret (^) - ASCII 94
        expect(orgUserRouteMatch("/user^name")).toEqual(false);

        // Other common punctuation that should also be rejected
        expect(orgUserRouteMatch("/user.name")).toEqual(false);
        expect(orgUserRouteMatch("/user!name")).toEqual(false);
        expect(orgUserRouteMatch("/user#name")).toEqual(false);
        expect(orgUserRouteMatch("/user$name")).toEqual(false);
        expect(orgUserRouteMatch("/user%name")).toEqual(false);
        expect(orgUserRouteMatch("/user&name")).toEqual(false);
        expect(orgUserRouteMatch("/user*name")).toEqual(false);
        expect(orgUserRouteMatch("/user+name")).toEqual(false);
      });
    });
  });
});
