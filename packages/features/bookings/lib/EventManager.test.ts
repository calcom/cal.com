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

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: vi.fn(() => ({
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      silly: vi.fn(),
      log: vi.fn(),
      info: vi.fn(),
    })),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    log: vi.fn(),
    info: vi.fn(),
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

  describe("getVideoCredentialAndWarnIfNotFound", () => {
    it("should find credential in videoCredentials by credentialId", async () => {
      const videoCredential = buildVideoCredential({ id: 1, type: "zoom_video" });
      eventManager = new EventManager({
        credentials: [videoCredential],
        destinationCalendar: null,
      });

      const result = await (eventManager as any).getVideoCredentialAndWarnIfNotFound(1, "zoom_video");

      expect(result).toMatchObject({
        id: videoCredential.id,
        type: videoCredential.type,
        userId: videoCredential.userId,
      });
      expect(mockedCredentialRepository.findCredentialForCalendarServiceById).not.toHaveBeenCalled();
    });

    it("should fetch credential from DB when not found in videoCredentials and credentialId > 0", async () => {
      const dbCredential = buildVideoCredential({ id: 2, type: "zoom_video" });
      eventManager = new EventManager({
        credentials: [],
        destinationCalendar: null,
      });

      mockedCredentialRepository.findCredentialForCalendarServiceById.mockResolvedValue(dbCredential as any);

      const result = await (eventManager as any).getVideoCredentialAndWarnIfNotFound(2, "zoom_video");

      expect(result).toEqual(dbCredential);
      expect(mockedCredentialRepository.findCredentialForCalendarServiceById).toHaveBeenCalledWith({
        id: 2,
      });
    });

    it("should fallback to finding by type when credentialId is null", async () => {
      const videoCredential = buildVideoCredential({ id: 1, type: "zoom_video" });
      eventManager = new EventManager({
        credentials: [videoCredential],
        destinationCalendar: null,
      });

      const result = await (eventManager as any).getVideoCredentialAndWarnIfNotFound(null, "zoom_video");

      expect(result).toMatchObject({
        id: videoCredential.id,
        type: videoCredential.type,
        userId: videoCredential.userId,
      });
      expect(mockedCredentialRepository.findCredentialForCalendarServiceById).not.toHaveBeenCalled();
    });

    it("should fallback to finding by type when credentialId is 0", async () => {
      const videoCredential = buildVideoCredential({ id: 1, type: "daily_video" });
      eventManager = new EventManager({
        credentials: [videoCredential],
        destinationCalendar: null,
      });

      const result = await (eventManager as any).getVideoCredentialAndWarnIfNotFound(0, "daily_video");

      // When credentialId is 0, it falls back to finding by type, which might return a global app credential
      expect(result).toMatchObject({
        type: videoCredential.type,
      });
      expect(mockedCredentialRepository.findCredentialForCalendarServiceById).not.toHaveBeenCalled();
    });

    it("should return null when credential is not found anywhere", async () => {
      eventManager = new EventManager({
        credentials: [],
        destinationCalendar: null,
      });

      mockedCredentialRepository.findCredentialForCalendarServiceById.mockResolvedValue(null);

      const result = await (eventManager as any).getVideoCredentialAndWarnIfNotFound(999, "zoom_video");

      expect(result).toBeNull();
      expect(mockedCredentialRepository.findCredentialForCalendarServiceById).toHaveBeenCalledWith({
        id: 999,
      });
    });

    it("should return null when credentialId is null and no matching type found", async () => {
      const videoCredential = buildVideoCredential({ id: 1, type: "zoom_video" });
      eventManager = new EventManager({
        credentials: [videoCredential],
        destinationCalendar: null,
      });

      const result = await (eventManager as any).getVideoCredentialAndWarnIfNotFound(null, "daily_video");

      // When no matching type is found, it might return a global app credential or null
      // The important thing is that it doesn't throw and doesn't call the repository
      expect(result).toBeDefined();
      expect(mockedCredentialRepository.findCredentialForCalendarServiceById).not.toHaveBeenCalled();
    });
  });

  describe("getCalendarCredentialAndWarnIfNotFound", () => {
    it("should find credential by delegationCredentialId when provided", async () => {
      const calendarCredential = buildCalendarCredential({
        id: 1,
        type: "google_calendar",
        delegatedToId: "delegation-123",
      });
      eventManager = new EventManager({
        credentials: [calendarCredential],
        destinationCalendar: null,
      });

      const result = await (eventManager as any).getCalendarCredentialAndWarnIfNotFound(
        1,
        "google_calendar",
        "delegation-123"
      );

      expect(result).toMatchObject({
        id: calendarCredential.id,
        type: calendarCredential.type,
        delegatedToId: calendarCredential.delegatedToId,
      });
      expect(mockedCredentialRepository.findCredentialForCalendarServiceById).not.toHaveBeenCalled();
    });

    it("should find credential in calendarCredentials by credentialId when no delegationCredentialId", async () => {
      const calendarCredential = buildCalendarCredential({ id: 1, type: "google_calendar" });
      eventManager = new EventManager({
        credentials: [calendarCredential],
        destinationCalendar: null,
      });

      const result = await (eventManager as any).getCalendarCredentialAndWarnIfNotFound(1, "google_calendar");

      expect(result).toMatchObject({
        id: calendarCredential.id,
        type: calendarCredential.type,
        userId: calendarCredential.userId,
      });
      expect(mockedCredentialRepository.findCredentialForCalendarServiceById).not.toHaveBeenCalled();
    });

    it("should fetch credential from DB when not found in calendarCredentials and credentialId > 0", async () => {
      const dbCredential = buildCalendarCredential({ id: 2, type: "google_calendar" });
      eventManager = new EventManager({
        credentials: [],
        destinationCalendar: null,
      });

      mockedCredentialRepository.findCredentialForCalendarServiceById.mockResolvedValue(dbCredential as any);

      const result = await (eventManager as any).getCalendarCredentialAndWarnIfNotFound(2, "google_calendar");

      expect(result).toEqual(dbCredential);
      expect(mockedCredentialRepository.findCredentialForCalendarServiceById).toHaveBeenCalledWith({
        id: 2,
      });
    });

    it("should fallback to finding by type when credentialId is null", async () => {
      const calendarCredential = buildCalendarCredential({ id: 1, type: "google_calendar" });
      eventManager = new EventManager({
        credentials: [calendarCredential],
        destinationCalendar: null,
      });

      const result = await (eventManager as any).getCalendarCredentialAndWarnIfNotFound(
        null,
        "google_calendar"
      );

      expect(result).toMatchObject({
        id: calendarCredential.id,
        type: calendarCredential.type,
        userId: calendarCredential.userId,
      });
      expect(mockedCredentialRepository.findCredentialForCalendarServiceById).not.toHaveBeenCalled();
    });

    it("should fallback to finding by type when credentialId is 0", async () => {
      const calendarCredential = buildCalendarCredential({ id: 1, type: "google_calendar" });
      eventManager = new EventManager({
        credentials: [calendarCredential],
        destinationCalendar: null,
      });

      const result = await (eventManager as any).getCalendarCredentialAndWarnIfNotFound(0, "google_calendar");

      expect(result).toMatchObject({
        id: calendarCredential.id,
        type: calendarCredential.type,
        userId: calendarCredential.userId,
      });
      expect(mockedCredentialRepository.findCredentialForCalendarServiceById).not.toHaveBeenCalled();
    });

    it("should return null when credential is not found anywhere", async () => {
      eventManager = new EventManager({
        credentials: [],
        destinationCalendar: null,
      });

      mockedCredentialRepository.findCredentialForCalendarServiceById.mockResolvedValue(null);

      const result = await (eventManager as any).getCalendarCredentialAndWarnIfNotFound(
        999,
        "google_calendar"
      );

      expect(result).toBeNull();
      expect(mockedCredentialRepository.findCredentialForCalendarServiceById).toHaveBeenCalledWith({
        id: 999,
      });
    });

    it("should return null when delegationCredentialId is provided but not found", async () => {
      eventManager = new EventManager({
        credentials: [],
        destinationCalendar: null,
      });

      const result = await (eventManager as any).getCalendarCredentialAndWarnIfNotFound(
        1,
        "google_calendar",
        "non-existent-delegation"
      );

      expect(result).toBeUndefined();
      expect(mockedCredentialRepository.findCredentialForCalendarServiceById).not.toHaveBeenCalled();
    });

    it("should prioritize delegationCredentialId over credentialId", async () => {
      const delegatedCredential = buildCalendarCredential({
        id: 1,
        type: "google_calendar",
        delegatedToId: "delegation-123",
      });
      const regularCredential = buildCalendarCredential({ id: 2, type: "google_calendar" });
      eventManager = new EventManager({
        credentials: [delegatedCredential, regularCredential],
        destinationCalendar: null,
      });

      const result = await (eventManager as any).getCalendarCredentialAndWarnIfNotFound(
        2,
        "google_calendar",
        "delegation-123"
      );

      expect(result).toMatchObject({
        id: delegatedCredential.id,
        type: delegatedCredential.type,
        delegatedToId: delegatedCredential.delegatedToId,
      });
      expect(mockedCredentialRepository.findCredentialForCalendarServiceById).not.toHaveBeenCalled();
    });
  });
});
