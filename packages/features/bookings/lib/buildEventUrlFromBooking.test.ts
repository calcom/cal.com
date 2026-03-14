import { constantsScenarios } from "@calcom/lib/__mocks__/constants";
import { getBrand } from "@calcom/features/ee/organizations/lib/getBrand";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildEventUrlFromBooking } from "./buildEventUrlFromBooking";

vi.mock("@calcom/features/ee/organizations/lib/getBrand", () => ({
  getBrand: vi.fn(),
}));

vi.mock("@calcom/prisma", () => ({
  default: {},
  prisma: {},
}));

const WEBSITE_URL = "https://buildEventTest.example";
beforeEach(() => {
  constantsScenarios.setWebsiteUrl(WEBSITE_URL);
});

describe("buildEventUrlFromBooking", () => {
  describe("Non Organization", () => {
    it("should correctly build the event URL for a team event booking", async () => {
      const booking = {
        eventType: {
          slug: "30min",
          team: {
            slug: "engineering",
            parentId: 123,
          },
        },
        profileEnrichedBookingUser: {
          profile: {
            organizationId: null,
            username: "john",
          },
        },
        dynamicGroupSlugRef: null,
      };
      const expectedUrl = `${WEBSITE_URL}/team/engineering/30min`;
      const result = await buildEventUrlFromBooking(booking);
      expect(result).toBe(expectedUrl);
    });

    it("should correctly build the event URL for a dynamic group booking", async () => {
      const booking = {
        eventType: {
          slug: "30min",
          team: null,
        },
        profileEnrichedBookingUser: {
          profile: {
            organizationId: null,
            username: "john",
          },
        },
        dynamicGroupSlugRef: "john+jane",
      };
      const expectedUrl = `${WEBSITE_URL}/john+jane/30min`;
      const result = await buildEventUrlFromBooking(booking);
      expect(result).toBe(expectedUrl);
    });

    it("should correctly build the event URL for a personal booking", async () => {
      const booking = {
        eventType: {
          slug: "30min",
          team: null,
        },
        profileEnrichedBookingUser: {
          profile: {
            organizationId: null,
            username: "john",
          },
        },
        dynamicGroupSlugRef: null,
      };
      const expectedUrl = `${WEBSITE_URL}/john/30min`;
      const result = await buildEventUrlFromBooking(booking);
      expect(result).toBe(expectedUrl);
    });
  });

  describe("Organization", () => {
    const organizationId = 123;
    const orgOrigin = "https://acme.cal.local";
    beforeEach(() => {
      vi.mocked(getBrand).mockResolvedValue({
        fullDomain: orgOrigin,
      } as Awaited<ReturnType<typeof getBrand>>);
    });
    it("should correctly build the event URL for a team event booking", async () => {
      const booking = {
        eventType: {
          slug: "30min",
          team: {
            slug: "engineering",
            parentId: 123,
          },
        },
        profileEnrichedBookingUser: {
          profile: {
            organizationId,
            username: "john",
          },
        },
        dynamicGroupSlugRef: null,
      };
      const expectedUrl = `${orgOrigin}/team/engineering/30min`;
      const result = await buildEventUrlFromBooking(booking);
      expect(result).toBe(expectedUrl);
    });

    it("should correctly build the event URL for a dynamic group booking", async () => {
      const booking = {
        eventType: {
          slug: "30min",
          team: null,
        },
        profileEnrichedBookingUser: {
          profile: {
            organizationId,
            username: "john",
          },
        },
        dynamicGroupSlugRef: "john+jane",
      };
      const expectedUrl = `${orgOrigin}/john+jane/30min`;
      const result = await buildEventUrlFromBooking(booking);
      expect(result).toBe(expectedUrl);
    });

    it("should correctly build the event URL for a personal booking", async () => {
      const booking = {
        eventType: {
          slug: "30min",
          team: null,
        },
        profileEnrichedBookingUser: {
          profile: {
            organizationId,
            username: "john",
          },
        },
        dynamicGroupSlugRef: null,
      };
      const expectedUrl = `${orgOrigin}/john/30min`;
      const result = await buildEventUrlFromBooking(booking);
      expect(result).toBe(expectedUrl);
    });
  });

  it("should throw if the username isn't set", async () => {
    const booking = {
      eventType: {
        slug: "30min",
        team: null,
      },
      profileEnrichedBookingUser: {
        profile: {
          organizationId: null,
          username: null,
        },
      },
      dynamicGroupSlugRef: null,
    };
    await expect(() => buildEventUrlFromBooking(booking)).rejects.toThrow(
      "No username found for booking user."
    );
  });

  describe("URL encoding for Location header compatibility", () => {
    beforeEach(() => {
      vi.mocked(getBrand).mockResolvedValue(null);
    });

    it("should encode non-ASCII characters in slugs to prevent Invalid character in header content", async () => {
      const chineseEventSlug = "rc注册后预约会议";
      const booking = {
        eventType: {
          slug: chineseEventSlug,
          team: {
            slug: "rc",
            parentId: null,
          },
        },
        profileEnrichedBookingUser: {
          profile: {
            organizationId: null,
            username: "john",
          },
        },
        dynamicGroupSlugRef: null,
      };
      const result = await buildEventUrlFromBooking(booking);
      const encodedSlug = encodeURIComponent(chineseEventSlug);
      expect(result).toBe(`${WEBSITE_URL}/team/rc/${encodedSlug}`);
      expect(result).not.toContain(chineseEventSlug);
      expect(result).toMatch(/^[\x00-\x7f]+$/);
    });

    it("should not encode username (only event slug is encoded)", async () => {
      const booking = {
        eventType: {
          slug: "30min",
          team: null,
        },
        profileEnrichedBookingUser: {
          profile: {
            organizationId: null,
            username: "john",
          },
        },
        dynamicGroupSlugRef: null,
      };
      const result = await buildEventUrlFromBooking(booking);
      expect(result).toBe(`${WEBSITE_URL}/john/30min`);
    });
  });

  describe("trailing slash handling", () => {
    it("should not produce double slashes when bookerUrl has trailing slash", async () => {
      const orgOriginWithTrailingSlash = "https://acme.cal.local/";
      vi.mocked(getBrand).mockResolvedValue({
        fullDomain: orgOriginWithTrailingSlash,
      } as Awaited<ReturnType<typeof getBrand>>);
      const booking = {
        eventType: {
          slug: "30min",
          team: {
            slug: "engineering",
            parentId: 123,
          },
        },
        profileEnrichedBookingUser: {
          profile: {
            organizationId: 123,
            username: "john",
          },
        },
        dynamicGroupSlugRef: null,
      };
      const result = await buildEventUrlFromBooking(booking);
      expect(result).toBe("https://acme.cal.local/team/engineering/30min");
      expect(result).not.toContain("//team");
    });
  });
});
