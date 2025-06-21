import { describe, expect, it, vi } from "vitest";

import EventManager from "./EventManager";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

// Mock the videoClient module
vi.mock("./videoClient", () => ({
  createMeeting: vi.fn(),
  updateMeeting: vi.fn(),
  deleteMeeting: vi.fn(),
}));

// Mock the FAKE_DAILY_CREDENTIAL
vi.mock("@calcom/app-store/dailyvideo/lib/VideoApiAdapter", () => ({
  FAKE_DAILY_CREDENTIAL: {
    id: 0,
    type: "daily_video",
    key: { apikey: "test-api-key" },
    userId: 0,
    user: { email: "" },
    appId: "daily-video",
    invalid: false,
    teamId: null,
    delegatedToId: null,
    delegatedTo: null,
    delegationCredentialId: null,
  },
}));

describe("EventManager - Google Meet Integration Bug Fix", () => {
  const mockUser = {
    credentials: [],
    destinationCalendar: null,
  };

  const mockGoogleMeetCredential: CredentialForCalendarService = {
    id: 1,
    type: "google_video",
    key: {},
    userId: 1,
    user: { email: "test@example.com" },
    appId: "google-meet",
    invalid: false,
    teamId: null,
    delegatedToId: null,
    delegatedTo: null,
    delegationCredentialId: null,
  };

  const mockEvent: CalendarEvent = {
    type: "test",
    title: "Test Event",
    startTime: new Date(),
    endTime: new Date(),
    organizer: { email: "test@example.com", name: "Test User" },
    attendees: [],
    location: "integrations:google:meet",
  };

  describe("getVideoCredential", () => {
    it("should correctly map google:meet location to google_video credential type", () => {
      const eventManager = new EventManager({
        ...mockUser,
        credentials: [mockGoogleMeetCredential],
      });

      // Access the private method for testing
      const getVideoCredential = (eventManager as any).getVideoCredential.bind(eventManager);
      
      const result = getVideoCredential(mockEvent);
      
      expect(result).toBeDefined();
      expect(result?.type).toBe("google_video");
      expect(result?.appId).toBe("google-meet");
    });

    it("should handle other video integrations correctly", () => {
      const mockZoomCredential: CredentialForCalendarService = {
        id: 2,
        type: "zoom_video",
        key: {},
        userId: 1,
        user: { email: "test@example.com" },
        appId: "zoom",
        invalid: false,
        teamId: null,
        delegatedToId: null,
        delegatedTo: null,
        delegationCredentialId: null,
      };

      const eventManager = new EventManager({
        ...mockUser,
        credentials: [mockZoomCredential],
      });

      const getVideoCredential = (eventManager as any).getVideoCredential.bind(eventManager);
      
      const zoomEvent = { ...mockEvent, location: "integrations:zoom:video" };
      const result = getVideoCredential(zoomEvent);
      
      expect(result).toBeDefined();
      expect(result?.type).toBe("zoom_video");
      expect(result?.appId).toBe("zoom");
    });

    it("should fallback to daily video when no matching credential is found", () => {
      const eventManager = new EventManager(mockUser);

      const getVideoCredential = (eventManager as any).getVideoCredential.bind(eventManager);
      
      const result = getVideoCredential(mockEvent);
      
      expect(result).toBeDefined();
      expect(result?.type).toBe("daily_video");
      expect(result?.appId).toBe("daily-video");
    });

    it("should use conferenceCredentialId when provided", () => {
      const eventManager = new EventManager({
        ...mockUser,
        credentials: [mockGoogleMeetCredential],
      });

      const getVideoCredential = (eventManager as any).getVideoCredential.bind(eventManager);
      
      const eventWithCredentialId = {
        ...mockEvent,
        conferenceCredentialId: 1,
      };
      
      const result = getVideoCredential(eventWithCredentialId);
      
      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
      expect(result?.type).toBe("google_video");
    });

    it("should handle unknown location types gracefully", () => {
      const eventManager = new EventManager(mockUser);

      const getVideoCredential = (eventManager as any).getVideoCredential.bind(eventManager);
      
      const unknownEvent = { ...mockEvent, location: "integrations:unknown:video" };
      const result = getVideoCredential(unknownEvent);
      
      expect(result).toBeDefined();
      expect(result?.type).toBe("daily_video");
    });
  });
}); 