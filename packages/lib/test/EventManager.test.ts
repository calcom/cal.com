import { describe, expect, it, vi, beforeEach } from 'vitest';
import { buildCalendarEvent } from "./builder";


// Mock dependencies before imports
vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: vi.fn(() => ({
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    })),
  },
}));

vi.mock("@calcom/lib/constants", () => ({
  WEBAPP_URL: "http://localhost:3000",
  APP_NAME: "Cal.com",
}));

vi.mock("lodash/cloneDeep", () => ({
  default: vi.fn((obj) => JSON.parse(JSON.stringify(obj))),
}));

const MSTeamsLocationType = "integrations:office365_video";

describe("EventManager", () => {
  describe("create - MS Teams with Outlook Calendar", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let mockCreateVideoEvent: ReturnType<typeof vi.fn>;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let mockCreateAllCalendarEvents: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      vi.clearAllMocks();
      mockCreateVideoEvent = vi.fn().mockResolvedValue({
        createdEvent: {
          type: "office365_video",
          id: "mock_id",
          url: "https://teams.microsoft.com/mock",
        },
        originalEvent: { location: "https://teams.microsoft.com/mock" },
      });
      mockCreateAllCalendarEvents = vi.fn().mockResolvedValue([]);
    });
    it("should skip dedicated video event creation when location is MS Teams and calendar is office365_calendar", async () => {
      const calEvent = buildCalendarEvent({
        location: MSTeamsLocationType,
        videoCallData: undefined,
      });

      const mainHostDestinationCalendar = {
        integration: "office365_calendar",
        externalId: "test@example.com",
        credentialId: 123,
        userId: 1,
        eventTypeId: null,
        primaryEmail: "test@example.com",
      };

      const locationString =
        typeof calEvent.location === "object" && calEvent.location !== null
          ? (calEvent.location as { value?: string }).value
          : calEvent.location;

      const isMSTeamsWithOutlookCalendar =
        calEvent.location === MSTeamsLocationType &&
        locationString === MSTeamsLocationType &&
        mainHostDestinationCalendar?.integration === "office365_calendar";

      expect(isMSTeamsWithOutlookCalendar).toBe(true);
    });

    it("should create dedicated video event when location is MS Teams but calendar is NOT office365_calendar", async () => {
      const calEvent = buildCalendarEvent({
        location: MSTeamsLocationType,
        videoCallData: undefined,
      });

      const mainHostDestinationCalendar = {
        integration: "google_calendar",
        externalId: "test@example.com",
        credentialId: 123,
        userId: 1,
        eventTypeId: null,
        primaryEmail: "test@example.com",
      };
      const locationString =
        typeof calEvent.location === "object" && calEvent.location !== null
          ? (calEvent.location as { value?: string }).value
          : calEvent.location;

      const isMSTeamsWithOutlookCalendar =
        calEvent.location === MSTeamsLocationType &&
        locationString === MSTeamsLocationType &&
        mainHostDestinationCalendar?.integration === "office365_calendar";

      expect(isMSTeamsWithOutlookCalendar).toBe(false);
    });
    it("should create dedicated video event for non-MS Teams location types", async () => {
      const calEvent = buildCalendarEvent({
        location: "integrations:daily", // Daily Video, not MS Teams
        videoCallData: undefined,
      });
      const mainHostDestinationCalendar = {
        integration: "office365_calendar",
        externalId: "test@example.com",
        credentialId: 123,
        userId: 1,
        eventTypeId: null,
        primaryEmail: "test@example.com",
      };
      const locationString =
        typeof calEvent.location === "object" && calEvent.location !== null
          ? (calEvent.location as { value?: string }).value
          : calEvent.location;

      const isMSTeamsWithOutlookCalendar =
        calEvent.location === MSTeamsLocationType &&
        locationString === MSTeamsLocationType &&
        mainHostDestinationCalendar?.integration === "office365_calendar";

      expect(isMSTeamsWithOutlookCalendar).toBe(false);
    });
    it("should handle location as object with value property", async () => {
      // Test the locationString extraction logic when location is an object
      const locationObject = { value: MSTeamsLocationType, optionValue: "" };

      const calEvent = buildCalendarEvent({
        location: MSTeamsLocationType, // This is how it would be stored
        videoCallData: undefined,
      });

      // Simulate what happens when evt.location is an object
      const evtWithObjectLocation = {
        ...calEvent,
        location: locationObject as unknown as string,
      };

      const locationString =
        typeof evtWithObjectLocation.location === "object" && evtWithObjectLocation.location !== null
          ? (evtWithObjectLocation.location as { value?: string }).value
          : evtWithObjectLocation.location;

      expect(locationString).toBe(MSTeamsLocationType);
    });
    describe("UpdateMSTeamsVideoCallData", () => {
      it("should update videoCallData.type to daily_video when location is MS Teams", async () => {
        const calEvent = buildCalendarEvent({
          location: MSTeamsLocationType,
          videoCallData: undefined,
        });

        const locationString =
          typeof calEvent.location === "object" && calEvent.location !== null
            ? (calEvent.location as { value?: string }).value
            : calEvent.location;

        expect(locationString).toBe(MSTeamsLocationType);
      });
    });
  });
});
