import { prisma } from "@calcom/prisma/__mocks__/prisma";

import { describe, expect, it, vi, beforeEach } from "vitest";

import { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";
import { symmetricDecrypt } from "@calcom/lib/crypto";
import type { DestinationCalendar } from "@calcom/prisma/client";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

import EventManager from "./EventManager";

vi.mock("@calcom/prisma", () => ({
  prisma,
}));

vi.mock("@calcom/lib/crypto", () => ({
  symmetricDecrypt: vi.fn(),
}));

vi.mock("@calcom/features/credentials/repositories/CredentialRepository", () => ({
  CredentialRepository: {
    findCredentialForCalendarServiceById: vi.fn(),
  },
}));

const mockedSymmetricDecrypt = vi.mocked(symmetricDecrypt);
const mockedCredentialRepository = vi.mocked(CredentialRepository);

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

function buildCalendarCredential(data: {
  id: number;
  type?: string;
  userId?: number;
  delegatedToId?: string | null;
}): CredentialForCalendarService {
  return {
    id: data.id,
    type: data.type || "google_calendar",
    key: {},
    userId: data.userId || 1,
    user: { email: "test@example.com" },
    teamId: null,
    appId: "google-calendar",
    invalid: false,
    delegatedTo: null,
    delegationCredentialId: null,
    delegatedToId: data.delegatedToId || null,
  };
}

function buildVideoCredential(data: {
  id: number;
  type?: string;
  userId?: number;
}): CredentialForCalendarService {
  return {
    id: data.id,
    type: data.type || "zoom_video",
    key: {},
    userId: data.userId || 1,
    user: { email: "test@example.com" },
    teamId: null,
    appId: "zoom",
    invalid: false,
    delegatedTo: null,
    delegationCredentialId: null,
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

describe("EventManager credential lookup methods", () => {
  let eventManager: EventManager;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getVideoCredential", () => {
    it("returns a cached credential when credentialId matches", async () => {
      const videoCredential = buildVideoCredential({ id: 42, type: "zoom_video" });
      eventManager = new EventManager({
        credentials: [videoCredential],
        destinationCalendar: null,
      });

      const result = await (eventManager as any).getVideoCredential(42, "zoom_video");

      expect(result).toMatchObject({ id: 42, type: "zoom_video" });
      expect(mockedCredentialRepository.findCredentialForCalendarServiceById).not.toHaveBeenCalled();
    });

    it("fetches credential from repository when not cached locally", async () => {
      const dbCredential = buildVideoCredential({ id: 7, type: "zoom_video" });
      eventManager = new EventManager({
        credentials: [],
        destinationCalendar: null,
      });
      mockedCredentialRepository.findCredentialForCalendarServiceById.mockResolvedValue(dbCredential as any);

      const result = await (eventManager as any).getVideoCredential(7, "zoom_video");

      expect(result).toEqual(dbCredential);
      expect(mockedCredentialRepository.findCredentialForCalendarServiceById).toHaveBeenCalledWith({ id: 7 });
    });

    it("falls back to credential type when credentialId is missing", async () => {
      const zoomCredential = buildVideoCredential({ id: 1, type: "zoom_video" });
      eventManager = new EventManager({
        credentials: [zoomCredential],
        destinationCalendar: null,
      });

      const result = await (eventManager as any).getVideoCredential(null, "zoom_video");

      expect(result).toMatchObject({ type: "zoom_video" });
      expect(mockedCredentialRepository.findCredentialForCalendarServiceById).not.toHaveBeenCalled();
    });
  });

  describe("getCalendarCredential", () => {
    it("prefers delegation credentials when delegationCredentialId is provided", async () => {
      const delegatedCredential = buildCalendarCredential({
        id: 10,
        delegatedToId: "delegation-123",
      });
      eventManager = new EventManager({
        credentials: [delegatedCredential],
        destinationCalendar: null,
      });

      const result = await (eventManager as any).getCalendarCredential(
        99,
        "google_calendar",
        "delegation-123"
      );

      expect(result).toMatchObject({ id: 10, delegatedToId: "delegation-123" });
      expect(mockedCredentialRepository.findCredentialForCalendarServiceById).not.toHaveBeenCalled();
    });

    it("fetches credential from repository when local cache misses", async () => {
      const dbCredential = buildCalendarCredential({ id: 5, type: "google_calendar" });
      eventManager = new EventManager({
        credentials: [],
        destinationCalendar: null,
      });
      mockedCredentialRepository.findCredentialForCalendarServiceById.mockResolvedValue(dbCredential as any);

      const result = await (eventManager as any).getCalendarCredential(5, "google_calendar");

      expect(result).toEqual(dbCredential);
      expect(mockedCredentialRepository.findCredentialForCalendarServiceById).toHaveBeenCalledWith({ id: 5 });
    });

    it("falls back to matching credential type when credentialId is absent", async () => {
      const calendarCredential = buildCalendarCredential({ id: 22, type: "google_calendar" });
      eventManager = new EventManager({
        credentials: [calendarCredential],
        destinationCalendar: null,
      });

      const result = await (eventManager as any).getCalendarCredential(null, "google_calendar");

      expect(result).toMatchObject({ id: 22, type: "google_calendar" });
      expect(mockedCredentialRepository.findCredentialForCalendarServiceById).not.toHaveBeenCalled();
    });
  });
});
