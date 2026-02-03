import { constantsScenarios } from "@calcom/lib/__mocks__/constants";

import { describe, it, vi, expect, beforeEach } from "vitest";

import { getBrand } from "@calcom/features/ee/organizations/lib/getBrand";

import { buildEventUrlFromBooking } from "./buildEventUrlFromBooking";

vi.mock("@calcom/features/ee/organizations/lib/getBrand", () => ({
  getBrand: vi.fn(),
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
      getBrand.mockResolvedValue({
        fullDomain: orgOrigin,
      });
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
});
