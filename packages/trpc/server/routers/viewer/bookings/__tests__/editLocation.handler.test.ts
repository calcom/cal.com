import { describe, expect, test, vi, beforeEach } from "vitest";

import {
  getLocationForOrganizerDefaultConferencingAppInEvtFormat,
  SystemError,
  UserError,
} from "../editLocation.handler";

vi.mock("@calcom/lib/server/repository/booking", () => ({
  BookingRepository: vi.fn().mockImplementation(() => ({
    updateLocationById: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe("getLocationForOrganizerDefaultConferencingAppInEvtFormat", () => {
  const mockTranslate = vi.fn((key: string) => key);

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("Dynamic link apps", () => {
    test("should return the app type for Zoom", () => {
      const organizer = {
        name: "Organizer",
        metadata: {
          defaultConferencingApp: {
            appSlug: "zoom",
          },
        },
      };

      const result = getLocationForOrganizerDefaultConferencingAppInEvtFormat({
        organizer,
        loggedInUserTranslate: mockTranslate,
      });

      expect(result).toBe("integrations:zoom");
    });

    test("should return the app type for Google Meet", () => {
      const organizer = {
        name: "Organizer",
        metadata: {
          defaultConferencingApp: {
            appSlug: "google-meet",
          },
        },
      };

      const result = getLocationForOrganizerDefaultConferencingAppInEvtFormat({
        organizer,
        loggedInUserTranslate: mockTranslate,
      });

      expect(result).toBe("integrations:google:meet");
    });

    test("should return the app type for Daily Video", () => {
      const organizer = {
        name: "Organizer",
        metadata: {
          defaultConferencingApp: {
            appSlug: "daily-video",
          },
        },
      };

      const result = getLocationForOrganizerDefaultConferencingAppInEvtFormat({
        organizer,
        loggedInUserTranslate: mockTranslate,
      });

      expect(result).toBe("integrations:daily");
    });
  });

  describe("Static link apps", () => {
    test("should return the app link for static link apps", () => {
      const organizer = {
        name: "Organizer",
        metadata: {
          defaultConferencingApp: {
            appSlug: "whereby",
            appLink: "https://whereby.com/my-room",
          },
        },
      };

      const result = getLocationForOrganizerDefaultConferencingAppInEvtFormat({
        organizer,
        loggedInUserTranslate: mockTranslate,
      });

      expect(result).toBe("https://whereby.com/my-room");
    });
  });

  describe("Error handling", () => {
    test("should throw UserError when no default conferencing app is configured", () => {
      const organizer = {
        name: "Organizer",
        metadata: null,
      };

      expect(() =>
        getLocationForOrganizerDefaultConferencingAppInEvtFormat({
          organizer,
          loggedInUserTranslate: mockTranslate,
        })
      ).toThrow(UserError);
    });
  });
});

describe("editLocationHandler - Core Functionality Tests", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test("should export required functions and classes", () => {
    expect(getLocationForOrganizerDefaultConferencingAppInEvtFormat).toBeDefined();
    expect(UserError).toBeDefined();
    expect(SystemError).toBeDefined();
  });

  describe("Error classes", () => {
    test("UserError should have correct properties", () => {
      const error = new UserError("User facing error");
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("LocationError");
      expect(error.message).toBe("User facing error");
    });

    test("SystemError should have correct properties", () => {
      const error = new SystemError("Internal system error");
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("SystemError");
      expect(error.message).toBe("Internal system error");
    });
  });

  describe("Location validation", () => {
    const mockTranslate = vi.fn((key: string) => key);

    test("should handle organizer default conferencing app", () => {
      const organizer = {
        name: "Test Organizer",
        metadata: {
          defaultConferencingApp: {
            appSlug: "zoom",
          },
        },
      };

      const result = getLocationForOrganizerDefaultConferencingAppInEvtFormat({
        organizer,
        loggedInUserTranslate: mockTranslate,
      });

      expect(result).toBe("integrations:zoom");
    });

    test("should throw error for missing conferencing app", () => {
      const organizer = {
        name: "Test Organizer",
        metadata: null,
      };

      expect(() =>
        getLocationForOrganizerDefaultConferencingAppInEvtFormat({
          organizer,
          loggedInUserTranslate: mockTranslate,
        })
      ).toThrow(UserError);
    });

    test("should handle static link apps", () => {
      const organizer = {
        name: "Test Organizer",
        metadata: {
          defaultConferencingApp: {
            appSlug: "whereby",
            appLink: "https://whereby.com/test-room",
          },
        },
      };

      const result = getLocationForOrganizerDefaultConferencingAppInEvtFormat({
        organizer,
        loggedInUserTranslate: mockTranslate,
      });

      expect(result).toBe("https://whereby.com/test-room");
    });

    test("should handle missing app link for static apps", () => {
      const organizer = {
        name: "Test Organizer",
        metadata: {
          defaultConferencingApp: {
            appSlug: "whereby",
          },
        },
      };

      expect(() =>
        getLocationForOrganizerDefaultConferencingAppInEvtFormat({
          organizer,
          loggedInUserTranslate: mockTranslate,
        })
      ).toThrow(SystemError);
    });
  });
});
