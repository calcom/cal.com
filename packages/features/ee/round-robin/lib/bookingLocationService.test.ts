import { describe, expect, it, vi, beforeEach } from "vitest";

import { BookingLocationService } from "./bookingLocationService";

vi.mock("@calcom/app-store/utils", () => ({
  getAppFromSlug: vi.fn(),
}));

vi.mock("@calcom/app-store/locations", async () => {
  const actual = await vi.importActual("@calcom/app-store/locations");
  return {
    ...actual,
    OrganizerDefaultConferencingAppType: "conferencing",
    CalVideoLocationType: "integrations:daily-video",
  };
});

const { getAppFromSlug } = await import("@calcom/app-store/utils");

describe("BookingLocationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getOrganizerDefaultConferencingAppLocation", () => {
    describe("Dynamic conferencing apps", () => {
      it("should return the app location type for a dynamic app like Google Meet", () => {
        const mockMetadata = {
          defaultConferencingApp: {
            appSlug: "google-meet",
          },
        };

        vi.mocked(getAppFromSlug).mockReturnValue({
          appData: {
            location: {
              type: "integrations:google:meet",
            },
          },
        } as any);

        const result = BookingLocationService.getOrganizerDefaultConferencingAppLocation({
          organizerMetadata: mockMetadata,
        });

        expect(result).toEqual({
          conferencingAppLocationType: "integrations:google:meet",
          isStaticLinkApp: false,
        });
        expect(getAppFromSlug).toHaveBeenCalledWith("google-meet");
      });

      it("should return the app location type for Zoom", () => {
        const mockMetadata = {
          defaultConferencingApp: {
            appSlug: "zoom",
          },
        };

        vi.mocked(getAppFromSlug).mockReturnValue({
          appData: {
            location: {
              type: "integrations:zoom",
            },
          },
        } as any);

        const result = BookingLocationService.getOrganizerDefaultConferencingAppLocation({
          organizerMetadata: mockMetadata,
        });

        expect(result).toEqual({
          conferencingAppLocationType: "integrations:zoom",
          isStaticLinkApp: false,
        });
      });

      it("should return null when app is not found", () => {
        const mockMetadata = {
          defaultConferencingApp: {
            appSlug: "unknown-app",
          },
        };

        vi.mocked(getAppFromSlug).mockReturnValue(null);

        const result = BookingLocationService.getOrganizerDefaultConferencingAppLocation({
          organizerMetadata: mockMetadata,
        });

        expect(result).toBeNull();
      });
    });

    describe("Static link apps", () => {
      it("should return static link for apps with appLink", () => {
        const mockMetadata = {
          defaultConferencingApp: {
            appSlug: "custom-video",
            appLink: "https://custom-video.com/room123",
          },
        };

        vi.mocked(getAppFromSlug).mockReturnValue({
          appData: {
            location: {
              type: "integrations:custom-video",
            },
          },
        } as any);

        const result = BookingLocationService.getOrganizerDefaultConferencingAppLocation({
          organizerMetadata: mockMetadata,
        });

        expect(result).toEqual({
          conferencingAppLocationType: "integrations:custom-video",
          isStaticLinkApp: true,
          staticLink: "https://custom-video.com/room123",
        });
      });
    });

    describe("Fallback scenarios", () => {
      it("should return null when no conferencing app is set", () => {
        const mockMetadata = {};

        const result = BookingLocationService.getOrganizerDefaultConferencingAppLocation({
          organizerMetadata: mockMetadata,
        });

        expect(result).toBeNull();
        expect(getAppFromSlug).not.toHaveBeenCalled();
      });

      it("should handle null metadata gracefully", () => {
        const result = BookingLocationService.getOrganizerDefaultConferencingAppLocation({
          organizerMetadata: null,
        });

        expect(result).toBeNull();
      });

      it("should handle undefined metadata gracefully", () => {
        const result = BookingLocationService.getOrganizerDefaultConferencingAppLocation({
          organizerMetadata: undefined,
        });

        expect(result).toBeNull();
      });
    });

    describe("Invalid metadata parsing", () => {
      it("should handle invalid metadata structure", () => {
        const invalidMetadata = {
          defaultConferencingApp: "not-an-object",
        };

        const result = BookingLocationService.getOrganizerDefaultConferencingAppLocation({
          organizerMetadata: invalidMetadata,
        });

        expect(result).toBeNull();
      });

      it("should handle metadata with missing appSlug", () => {
        const mockMetadata = {
          defaultConferencingApp: {
            appLink: "https://some-link.com",
          },
        };

        const result = BookingLocationService.getOrganizerDefaultConferencingAppLocation({
          organizerMetadata: mockMetadata,
        });

        expect(result).toBeNull();
      });
    });

    describe("Edge cases", () => {
      it("should handle app with no appData", () => {
        const mockMetadata = {
          defaultConferencingApp: {
            appSlug: "app-without-data",
          },
        };

        vi.mocked(getAppFromSlug).mockReturnValue({} as any);

        const result = BookingLocationService.getOrganizerDefaultConferencingAppLocation({
          organizerMetadata: mockMetadata,
        });

        expect(result).toBeNull();
      });

      it("should handle app with no location type", () => {
        const mockMetadata = {
          defaultConferencingApp: {
            appSlug: "app-without-location-type",
          },
        };

        vi.mocked(getAppFromSlug).mockReturnValue({
          appData: {
            location: {},
          },
        } as any);

        const result = BookingLocationService.getOrganizerDefaultConferencingAppLocation({
          organizerMetadata: mockMetadata,
        });

        expect(result).toBeNull();
      });
    });
  });

  describe("getLocationForHost", () => {
    it("should use organizer default when allowed and available", () => {
      const mockHostMetadata = {
        defaultConferencingApp: {
          appSlug: "zoom",
        },
      };

      vi.mocked(getAppFromSlug).mockReturnValue({
        appData: {
          location: {
            type: "integrations:zoom",
          },
        },
      } as any);

      const result = BookingLocationService.getLocationForHost({
        hostMetadata: mockHostMetadata,
        eventTypeLocations: [{ type: "conferencing" }],
        isTeamEventType: true,
      });

      expect(result).toEqual({
        bookingLocation: "integrations:zoom",
        requiresActualLink: true,
        conferenceCredentialId: null,
      });
    });

    it("should use static link when organizer default is a static link app", () => {
      const mockHostMetadata = {
        defaultConferencingApp: {
          appSlug: "custom-video",
          appLink: "https://custom-video.com/room123",
        },
      };

      vi.mocked(getAppFromSlug).mockReturnValue({
        appData: {
          location: {
            type: "integrations:custom-video",
          },
        },
      } as any);

      const result = BookingLocationService.getLocationForHost({
        hostMetadata: mockHostMetadata,
        eventTypeLocations: [{ type: "conferencing" }],
        isTeamEventType: true,
      });

      expect(result).toEqual({
        bookingLocation: "https://custom-video.com/room123",
        requiresActualLink: false,
      });
    });

    it("should fallback to first real location when organizer default not available", () => {
      const mockHostMetadata = {};

      const result = BookingLocationService.getLocationForHost({
        hostMetadata: mockHostMetadata,
        eventTypeLocations: [{ type: "conferencing" }, { type: "integrations:google:meet" }],
        isTeamEventType: true,
      });

      expect(result).toEqual({
        bookingLocation: "integrations:google:meet",
        requiresActualLink: true,
        conferenceCredentialId: null,
      });
    });

    it("should default to Cal Video when no locations configured", () => {
      const mockHostMetadata = {};

      const result = BookingLocationService.getLocationForHost({
        hostMetadata: mockHostMetadata,
        eventTypeLocations: [{ type: "conferencing" }],
        isTeamEventType: true,
      });

      expect(result).toEqual({
        bookingLocation: "integrations:daily-video",
        requiresActualLink: true,
        conferenceCredentialId: null,
      });
    });

    it("should not use organizer default for non-team and non-managed events", () => {
      const mockHostMetadata = {
        defaultConferencingApp: {
          appSlug: "zoom",
        },
      };

      vi.mocked(getAppFromSlug).mockReturnValue({
        appData: {
          location: {
            type: "integrations:zoom",
          },
        },
      } as any);

      const result = BookingLocationService.getLocationForHost({
        hostMetadata: mockHostMetadata,
        eventTypeLocations: [{ type: "conferencing" }, { type: "integrations:google:meet" }],
        isTeamEventType: false,
        isManagedEventType: false,
      });

      expect(result).toEqual({
        bookingLocation: "integrations:google:meet",
        requiresActualLink: true,
        conferenceCredentialId: null,
      });
    });
  });

  describe("getLocationDetailsFromType", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    describe("Dynamic location types", () => {
      it("should return location type with credential ID when present", () => {
        const locationType = "integrations:zoom";
        const eventTypeLocations = [
          { type: "integrations:zoom", credentialId: 123 },
          { type: "integrations:google:meet" },
        ];

        const result = BookingLocationService.getLocationDetailsFromType({
          locationType,
          eventTypeLocations,
        });

        expect(result).toEqual({
          bookingLocation: "integrations:zoom",
          conferenceCredentialId: 123,
        });
      });

      it("should return location type without credential ID when not present", () => {
        const locationType = "integrations:google:meet";
        const eventTypeLocations = [{ type: "integrations:google:meet" }, { type: "integrations:zoom" }];

        const result = BookingLocationService.getLocationDetailsFromType({
          locationType,
          eventTypeLocations,
        });

        expect(result).toEqual({
          bookingLocation: "integrations:google:meet",
          conferenceCredentialId: null,
        });
      });

      it("should handle Cal Video location type", () => {
        const locationType = "integrations:daily-video";
        const eventTypeLocations = [{ type: "integrations:daily-video" }];

        const result = BookingLocationService.getLocationDetailsFromType({
          locationType,
          eventTypeLocations,
        });

        expect(result).toEqual({
          bookingLocation: "integrations:daily-video",
          conferenceCredentialId: null,
        });
      });
    });

    describe("Static link values", () => {
      it("should return static URL as-is without credential ID", () => {
        const locationType = "https://zoom.us/j/123456789";
        const eventTypeLocations = [{ type: "integrations:zoom", link: "https://zoom.us/j/123456789" }];

        const result = BookingLocationService.getLocationDetailsFromType({
          locationType,
          eventTypeLocations,
        });

        expect(result).toEqual({
          bookingLocation: "https://zoom.us/j/123456789",
          conferenceCredentialId: null,
        });
      });

      it("should handle custom static links", () => {
        const locationType = "https://custom-video.com/room123";
        const eventTypeLocations = [
          { type: "integrations:custom", link: "https://custom-video.com/room123" },
        ];

        const result = BookingLocationService.getLocationDetailsFromType({
          locationType,
          eventTypeLocations,
        });

        expect(result).toEqual({
          bookingLocation: "https://custom-video.com/room123",
          conferenceCredentialId: null,
        });
      });
    });

    describe("Edge cases", () => {
      it("should handle empty event type locations", () => {
        const locationType = "integrations:zoom";
        const eventTypeLocations: any[] = [];

        const result = BookingLocationService.getLocationDetailsFromType({
          locationType,
          eventTypeLocations,
        });

        expect(result).toEqual({
          bookingLocation: "integrations:zoom",
          conferenceCredentialId: null,
        });
      });

      it("should handle location type not in event type locations", () => {
        const locationType = "integrations:teams";
        const eventTypeLocations = [{ type: "integrations:zoom" }, { type: "integrations:google:meet" }];

        const result = BookingLocationService.getLocationDetailsFromType({
          locationType,
          eventTypeLocations,
        });

        expect(result).toEqual({
          bookingLocation: "integrations:teams",
          conferenceCredentialId: null,
        });
      });

      it("should handle multiple locations with same type but different credential IDs", () => {
        const locationType = "integrations:zoom";
        const eventTypeLocations = [
          { type: "integrations:zoom", credentialId: 123 },
          { type: "integrations:zoom", credentialId: 456 },
        ];

        // getLocationValueForDB would pick the last matching one due to forEach
        const result = BookingLocationService.getLocationDetailsFromType({
          locationType,
          eventTypeLocations,
        });

        expect(result).toEqual({
          bookingLocation: "integrations:zoom",
          conferenceCredentialId: 456,
        });
      });

      it("should handle location with 0 as credential ID", () => {
        const locationType = "integrations:zoom";
        const eventTypeLocations = [{ type: "integrations:zoom", credentialId: 0 }];

        const result = BookingLocationService.getLocationDetailsFromType({
          locationType,
          eventTypeLocations,
        });

        expect(result).toEqual({
          bookingLocation: "integrations:zoom",
          conferenceCredentialId: 0,
        });
      });
    });

    describe("Special location types", () => {
      it("should handle phone location type", () => {
        const locationType = "phone";
        const eventTypeLocations = [{ type: "phone" }];

        const result = BookingLocationService.getLocationDetailsFromType({
          locationType,
          eventTypeLocations,
        });

        expect(result).toEqual({
          bookingLocation: "phone",
          conferenceCredentialId: null,
        });
      });

      it("should handle in-person location type", () => {
        const locationType = "inPerson";
        const eventTypeLocations = [{ type: "inPerson", address: "123 Main St" }];

        const result = BookingLocationService.getLocationDetailsFromType({
          locationType,
          eventTypeLocations,
        });

        expect(result).toEqual({
          bookingLocation: "123 Main St", // getLocationValueForDB returns the address for inPerson
          conferenceCredentialId: null,
        });
      });

      it("should handle attendee in-person location", () => {
        const locationType = "attendeeInPerson";
        const eventTypeLocations = [{ type: "attendeeInPerson" }];

        const result = BookingLocationService.getLocationDetailsFromType({
          locationType,
          eventTypeLocations,
        });

        expect(result).toEqual({
          bookingLocation: "attendeeInPerson",
          conferenceCredentialId: null,
        });
      });
    });

    describe("Conferencing app location", () => {
      it("should handle conferencing location type (organizer default)", () => {
        const locationType = "conferencing";
        const eventTypeLocations = [{ type: "conferencing" }];

        const result = BookingLocationService.getLocationDetailsFromType({
          locationType,
          eventTypeLocations,
        });

        expect(result).toEqual({
          bookingLocation: "conferencing",
          conferenceCredentialId: null,
        });
      });
    });
  });
});
