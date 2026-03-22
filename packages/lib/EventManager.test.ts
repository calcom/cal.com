import type { DestinationCalendar } from "@prisma/client";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { symmetricDecrypt } from "@calcom/lib/crypto";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

import EventManager from "./EventManager";
import { createMeeting } from "./videoClient";

vi.mock("@calcom/lib/crypto", () => ({
  symmetricDecrypt: vi.fn(),
}));

vi.mock("./videoClient", () => ({
  createMeeting: vi.fn(),
  updateMeeting: vi.fn(),
  deleteMeeting: vi.fn(),
}));

const mockedSymmetricDecrypt = vi.mocked(symmetricDecrypt);
const mockedCreateMeeting = vi.mocked(createMeeting);

function buildCalDAVCredential(data: {
  id: number;
  key: string;
  userId?: number;
}): CredentialForCalendarService {
  return {
    id: data.id,
    type: "caldav_calendar",
    key: data.key,
    userId: data.userId || 1,
    user: { email: "test@example.com" },
    teamId: null,
    appId: "caldav-calendar",
    invalid: false,
    delegatedTo: null,
    delegationCredentialId: null,
  };
}

function buildDestinationCalendar(data: {
  id: number;
  integration: string;
  externalId: string | null;
}): DestinationCalendar {
  return {
    id: data.id,
    integration: data.integration,
    externalId: data.externalId || "",
    userId: 1,
    eventTypeId: null,
    credentialId: null,
    primaryEmail: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    delegationCredentialId: null,
    domainWideDelegationCredentialId: null,
  };
}

function buildVideoCredential(data: {
  id: number;
  type: string;
  appId?: string;
  userId?: number;
}): CredentialForCalendarService {
  return {
    id: data.id,
    type: data.type,
    key: {},
    userId: data.userId ?? 1,
    user: { email: "video@example.com" },
    teamId: null,
    appId: data.appId ?? "msteams",
    invalid: false,
    delegatedTo: null,
    delegationCredentialId: null,
  };
}

function buildVideoEvent(data: { location: string; conferenceCredentialId?: number }): CalendarEvent {
  return {
    type: "test-event",
    title: "Test Event",
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    organizer: {
      id: 1,
      email: "organizer@example.com",
      name: "Organizer",
      username: "organizer",
      language: { locale: "en", translate: ((key: string) => key) as any },
      timeZone: "UTC",
      timeFormat: "h:mma",
    },
    attendees: [],
    location: data.location,
    conferenceCredentialId: data.conferenceCredentialId,
  };
}

describe("EventManager CalDAV credential validation", () => {
  let eventManager: EventManager;

  beforeEach(() => {
    vi.clearAllMocks();
    eventManager = new EventManager({
      credentials: [],
      destinationCalendar: null,
    });
  });

  describe("extractServerUrlFromCredential", () => {
    it("should extract server URL from valid CalDAV credential", () => {
      const credential = buildCalDAVCredential({
        id: 1,
        key: "encrypted_key",
      });

      mockedSymmetricDecrypt.mockReturnValue(
        JSON.stringify({
          username: "user",
          password: "pass",
          url: "https://caldav.example.com/dav/calendars/user/",
        })
      );

      const result = (eventManager as any).extractServerUrlFromCredential(credential);
      expect(result).toBe("https://caldav.example.com");
      expect(mockedSymmetricDecrypt).toHaveBeenCalledWith(
        "encrypted_key",
        process.env.CALENDSO_ENCRYPTION_KEY || ""
      );
    });

    it("should return null for non-CalDAV credential", () => {
      const credential = {
        ...buildCalDAVCredential({ id: 1, key: "encrypted_key" }),
        type: "google_calendar",
      } as CredentialForCalendarService;

      const result = (eventManager as any).extractServerUrlFromCredential(credential);
      expect(result).toBeNull();
      expect(mockedSymmetricDecrypt).not.toHaveBeenCalled();
    });

    it("should return null when decryption fails", () => {
      const credential = buildCalDAVCredential({
        id: 1,
        key: "invalid_key",
      });

      mockedSymmetricDecrypt.mockImplementation(() => {
        throw new Error("Decryption failed");
      });

      const result = (eventManager as any).extractServerUrlFromCredential(credential);
      expect(result).toBeNull();
    });

    it("should return null when decrypted data has no URL", () => {
      const credential = buildCalDAVCredential({
        id: 1,
        key: "encrypted_key",
      });

      mockedSymmetricDecrypt.mockReturnValue(
        JSON.stringify({
          username: "user",
          password: "pass",
        })
      );

      const result = (eventManager as any).extractServerUrlFromCredential(credential);
      expect(result).toBeNull();
    });

    it("should return null when URL is invalid", () => {
      const credential = buildCalDAVCredential({
        id: 1,
        key: "encrypted_key",
      });

      mockedSymmetricDecrypt.mockReturnValue(
        JSON.stringify({
          username: "user",
          password: "pass",
          url: "invalid-url",
        })
      );

      const result = (eventManager as any).extractServerUrlFromCredential(credential);
      expect(result).toBeNull();
    });

    it("should handle URLs with different ports", () => {
      const credential = buildCalDAVCredential({
        id: 1,
        key: "encrypted_key",
      });

      mockedSymmetricDecrypt.mockReturnValue(
        JSON.stringify({
          username: "user",
          password: "pass",
          url: "https://caldav.example.com:8443/dav/calendars/user/",
        })
      );

      const result = (eventManager as any).extractServerUrlFromCredential(credential);
      expect(result).toBe("https://caldav.example.com:8443");
    });

    it("should handle HTTP URLs", () => {
      const credential = buildCalDAVCredential({
        id: 1,
        key: "encrypted_key",
      });

      mockedSymmetricDecrypt.mockReturnValue(
        JSON.stringify({
          username: "user",
          password: "pass",
          url: "http://caldav.internal.com/dav/calendars/user/",
        })
      );

      const result = (eventManager as any).extractServerUrlFromCredential(credential);
      expect(result).toBe("http://caldav.internal.com");
    });
  });

  describe("extractServerUrlFromDestination", () => {
    it("should extract server URL from CalDAV destination calendar", () => {
      const destination = buildDestinationCalendar({
        id: 1,
        integration: "caldav_calendar",
        externalId: "https://caldav.example.com/dav/calendars/user/calendar1/",
      });

      const result = (eventManager as any).extractServerUrlFromDestination(destination);
      expect(result).toBe("https://caldav.example.com");
    });

    it("should return null for non-CalDAV destination", () => {
      const destination = buildDestinationCalendar({
        id: 1,
        integration: "google_calendar",
        externalId: "calendar@gmail.com",
      });

      const result = (eventManager as any).extractServerUrlFromDestination(destination);
      expect(result).toBeNull();
    });

    it("should return null when externalId is null", () => {
      const destination = buildDestinationCalendar({
        id: 1,
        integration: "caldav_calendar",
        externalId: null,
      });

      const result = (eventManager as any).extractServerUrlFromDestination(destination);
      expect(result).toBeNull();
    });

    it("should return null when externalId is invalid URL", () => {
      const destination = buildDestinationCalendar({
        id: 1,
        integration: "caldav_calendar",
        externalId: "invalid-url",
      });

      const result = (eventManager as any).extractServerUrlFromDestination(destination);
      expect(result).toBeNull();
    });

    it("should handle URLs with different ports", () => {
      const destination = buildDestinationCalendar({
        id: 1,
        integration: "caldav_calendar",
        externalId: "https://caldav.example.com:8443/dav/calendars/user/calendar1/",
      });

      const result = (eventManager as any).extractServerUrlFromDestination(destination);
      expect(result).toBe("https://caldav.example.com:8443");
    });

    it("should handle HTTP URLs", () => {
      const destination = buildDestinationCalendar({
        id: 1,
        integration: "caldav_calendar",
        externalId: "http://caldav.internal.com/dav/calendars/user/calendar1/",
      });

      const result = (eventManager as any).extractServerUrlFromDestination(destination);
      expect(result).toBe("http://caldav.internal.com");
    });
  });

  describe("credentialMatchesDestination", () => {
    it("should return true for matching CalDAV server URLs", () => {
      const credential = buildCalDAVCredential({
        id: 1,
        key: "encrypted_key",
      });

      const destination = buildDestinationCalendar({
        id: 1,
        integration: "caldav_calendar",
        externalId: "https://caldav.example.com/dav/calendars/user/calendar1/",
      });

      mockedSymmetricDecrypt.mockReturnValue(
        JSON.stringify({
          username: "user",
          password: "pass",
          url: "https://caldav.example.com/dav/calendars/user/",
        })
      );

      const result = (eventManager as any).credentialMatchesDestination(credential, destination);
      expect(result).toBe(true);
    });

    it("should return false for non-matching CalDAV server URLs", () => {
      const credential = buildCalDAVCredential({
        id: 1,
        key: "encrypted_key",
      });

      const destination = buildDestinationCalendar({
        id: 1,
        integration: "caldav_calendar",
        externalId: "https://different.example.com/dav/calendars/user/calendar1/",
      });

      mockedSymmetricDecrypt.mockReturnValue(
        JSON.stringify({
          username: "user",
          password: "pass",
          url: "https://caldav.example.com/dav/calendars/user/",
        })
      );

      const result = (eventManager as any).credentialMatchesDestination(credential, destination);
      expect(result).toBe(false);
    });

    it("should return true for non-CalDAV credentials", () => {
      const credential = {
        ...buildCalDAVCredential({ id: 1, key: "encrypted_key" }),
        type: "google_calendar",
      } as CredentialForCalendarService;

      const destination = buildDestinationCalendar({
        id: 1,
        integration: "google_calendar",
        externalId: "calendar@gmail.com",
      });

      const result = (eventManager as any).credentialMatchesDestination(credential, destination);
      expect(result).toBe(true);
      expect(symmetricDecrypt).not.toHaveBeenCalled();
    });

    it("should return true when credential is CalDAV but destination is not", () => {
      const credential = buildCalDAVCredential({
        id: 1,
        key: "encrypted_key",
      });

      const destination = buildDestinationCalendar({
        id: 1,
        integration: "google_calendar",
        externalId: "calendar@gmail.com",
      });

      const result = (eventManager as any).credentialMatchesDestination(credential, destination);
      expect(result).toBe(true);
      expect(symmetricDecrypt).not.toHaveBeenCalled();
    });

    it("should return false when credential URL extraction fails", () => {
      const credential = buildCalDAVCredential({
        id: 1,
        key: "invalid_key",
      });

      const destination = buildDestinationCalendar({
        id: 1,
        integration: "caldav_calendar",
        externalId: "https://caldav.example.com/dav/calendars/user/calendar1/",
      });

      mockedSymmetricDecrypt.mockImplementation(() => {
        throw new Error("Decryption failed");
      });

      const result = (eventManager as any).credentialMatchesDestination(credential, destination);
      expect(result).toBe(false);
    });

    it("should return false when destination URL extraction fails", () => {
      const credential = buildCalDAVCredential({
        id: 1,
        key: "encrypted_key",
      });

      const destination = buildDestinationCalendar({
        id: 1,
        integration: "caldav_calendar",
        externalId: "invalid-url",
      });

      mockedSymmetricDecrypt.mockReturnValue(
        JSON.stringify({
          username: "user",
          password: "pass",
          url: "https://caldav.example.com/dav/calendars/user/",
        })
      );

      const result = (eventManager as any).credentialMatchesDestination(credential, destination);
      expect(result).toBe(false);
    });

    it("should handle URLs with different paths but same server", () => {
      const credential = buildCalDAVCredential({
        id: 1,
        key: "encrypted_key",
      });

      const destination = buildDestinationCalendar({
        id: 1,
        integration: "caldav_calendar",
        externalId: "https://caldav.example.com/different/path/calendar1/",
      });

      mockedSymmetricDecrypt.mockReturnValue(
        JSON.stringify({
          username: "user",
          password: "pass",
          url: "https://caldav.example.com/dav/calendars/user/",
        })
      );

      const result = (eventManager as any).credentialMatchesDestination(credential, destination);
      expect(result).toBe(true);
    });

    it("should handle URLs with different ports as non-matching", () => {
      const credential = buildCalDAVCredential({
        id: 1,
        key: "encrypted_key",
      });

      const destination = buildDestinationCalendar({
        id: 1,
        integration: "caldav_calendar",
        externalId: "https://caldav.example.com:8443/dav/calendars/user/calendar1/",
      });

      mockedSymmetricDecrypt.mockReturnValue(
        JSON.stringify({
          username: "user",
          password: "pass",
          url: "https://caldav.example.com:9443/dav/calendars/user/",
        })
      );

      const result = (eventManager as any).credentialMatchesDestination(credential, destination);
      expect(result).toBe(false);
    });

    it("should handle HTTP vs HTTPS as non-matching", () => {
      const credential = buildCalDAVCredential({
        id: 1,
        key: "encrypted_key",
      });

      const destination = buildDestinationCalendar({
        id: 1,
        integration: "caldav_calendar",
        externalId: "https://caldav.example.com/dav/calendars/user/calendar1/",
      });

      mockedSymmetricDecrypt.mockReturnValue(
        JSON.stringify({
          username: "user",
          password: "pass",
          url: "http://caldav.example.com/dav/calendars/user/",
        })
      );

      const result = (eventManager as any).credentialMatchesDestination(credential, destination);
      expect(result).toBe(false);
    });
  });
});

describe("EventManager video credential resolution", () => {
  it("uses exact conferenceCredentialId when it is available", () => {
    const teamsCredential = buildVideoCredential({ id: 11, type: "office365_video", appId: "msteams" });
    const eventManager = new EventManager({
      credentials: [teamsCredential],
      destinationCalendar: null,
    });
    const event = buildVideoEvent({
      location: "integrations:office365_video",
      conferenceCredentialId: 11,
    });

    const resolved = (eventManager as any).getVideoCredential(event);
    expect(resolved?.id).toBe(11);
    expect(resolved?.type).toBe("office365_video");
  });

  it("falls back to provider type when conferenceCredentialId is stale", () => {
    const teamsCredential = buildVideoCredential({ id: 22, type: "office365_video", appId: "msteams" });
    const eventManager = new EventManager({
      credentials: [teamsCredential],
      destinationCalendar: null,
    });
    const event = buildVideoEvent({
      location: "integrations:office365_video",
      conferenceCredentialId: 9999,
    });

    const resolved = (eventManager as any).getVideoCredential(event);
    expect(resolved?.id).toBe(22);
    expect(resolved?.type).toBe("office365_video");
  });

  it("prefers organizer-scoped provider credential when conferenceCredentialId is stale", () => {
    const otherHostTeamsCredential = buildVideoCredential({
      id: 40,
      type: "office365_video",
      appId: "msteams",
      userId: 99,
    });
    const organizerTeamsCredential = buildVideoCredential({
      id: 31,
      type: "office365_video",
      appId: "msteams",
      userId: 1,
    });
    const eventManager = new EventManager({
      credentials: [otherHostTeamsCredential, organizerTeamsCredential],
      destinationCalendar: null,
    });
    const event = buildVideoEvent({
      location: "integrations:office365_video",
      conferenceCredentialId: 9999,
    });

    const resolved = (eventManager as any).getVideoCredential(event);
    expect(resolved?.id).toBe(31);
    expect(resolved?.userId).toBe(1);
    expect(resolved?.type).toBe("office365_video");
  });

  it("falls back to jitsi only when no provider credential is available", () => {
    const zoomCredential = buildVideoCredential({ id: 33, type: "zoom_video", appId: "zoom" });
    const eventManager = new EventManager({
      credentials: [zoomCredential],
      destinationCalendar: null,
    });
    const event = buildVideoEvent({
      location: "integrations:office365_video",
      conferenceCredentialId: 9999,
    });

    const resolved = (eventManager as any).getVideoCredential(event);
    expect(resolved?.type).toBe("jitsi_video");
    expect(resolved?.appId).toBe("jitsi");
    expect(resolved?.id).toBe(0);
  });

  it("creates a jitsi meeting URL when fallback credential is used", async () => {
    const zoomCredential = buildVideoCredential({ id: 44, type: "zoom_video", appId: "zoom" });
    const eventManager = new EventManager({
      credentials: [zoomCredential],
      destinationCalendar: null,
    });
    const event = buildVideoEvent({
      location: "integrations:office365_video",
      conferenceCredentialId: 9999,
    });

    mockedCreateMeeting.mockResolvedValueOnce({
      appName: "jitsi",
      type: "jitsi_video",
      uid: "fallback-jitsi-meeting",
      originalEvent: event,
      success: true,
      createdEvent: {
        type: "jitsi_video",
        id: "fallback-jitsi-room",
        password: "",
        url: "https://meet.jit.si/fallback-jitsi-room",
      },
      credentialId: 0,
    } as Awaited<ReturnType<typeof createMeeting>>);

    const result = await (eventManager as any).createVideoEvent(event);

    expect(mockedCreateMeeting).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "jitsi_video",
        appId: "jitsi",
      }),
      event
    );
    expect(result?.createdEvent?.url).toContain("meet.jit.si");
  });
});
