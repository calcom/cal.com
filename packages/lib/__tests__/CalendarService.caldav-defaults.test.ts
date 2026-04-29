import { describe, it, expect, vi, beforeEach } from "vitest";
import BaseCalendarService from "../CalendarService";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";

// Mock the dependencies
vi.mock("../crypto", () => ({
  symmetricDecrypt: vi.fn().mockReturnValue(JSON.stringify({ 
    username: "user", 
    password: "pass", 
    url: "https://caldav.example.com" 
  })),
}));

vi.mock("./logger", () => ({
  default: {
    getSubLogger: vi.fn().mockReturnThis(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("tsdav", async () => {
  const actual = await vi.importActual("tsdav");
  return {
    ...actual,
    createDAVClient: vi.fn(),
    fetchCalendarObjects: vi.fn(),
    createCalendarObject: vi.fn(),
  };
});

// Concrete class for testing the abstract BaseCalendarService
class TestCalendarService extends BaseCalendarService {
  constructor(credential: any) {
    super(credential, "test-caldav");
  }
  getAccountEmail() { return "test@example.com"; }
}

describe("BaseCalendarService - CalDAV Default Calendar Selection", () => {
  const mockCredential = { key: "mock-key", user: { email: "owner@example.com" } };
  let service: TestCalendarService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TestCalendarService(mockCredential);
  });

  it("should resolve default calendar using CALDAV:schedule-default-calendar-URL", async () => {
    const { createDAVClient } = await import("tsdav");
    const mockClient = {
      fetchCalendars: vi.fn().mockResolvedValue([
        { url: "https://caldav.example.com/cal1/", components: ["VEVENT"], displayName: "Calendar 1" },
        { url: "https://caldav.example.com/default/", components: ["VEVENT"], displayName: "Default Calendar" },
      ]),
      fetchPrincipalUrl: vi.fn().mockResolvedValue("https://caldav.example.com/principal/"),
      propfind: vi.fn().mockResolvedValue([
        {
          props: {
            "schedule-default-calendar-URL": { href: "https://caldav.example.com/default/" }
          }
        }
      ]),
    };
    (createDAVClient as any).mockResolvedValue(mockClient);

    const calendars = await service.listCalendars();
    
    expect(calendars).toHaveLength(2);
    expect(calendars.find(c => c.externalId.includes("default"))?.isDefault).toBe(true);
    expect(calendars.find(c => c.externalId.includes("cal1"))?.isDefault).toBe(false);
  });

  it("should fall back to calendar-user-address-set if schedule-default-calendar-URL is missing", async () => {
    const { createDAVClient } = await import("tsdav");
    const mockClient = {
      fetchCalendars: vi.fn().mockResolvedValue([
        { url: "https://caldav.example.com/fallback/", components: ["VEVENT"] },
      ]),
      fetchPrincipalUrl: vi.fn().mockResolvedValue("https://caldav.example.com/principal/"),
      propfind: vi.fn()
        .mockResolvedValueOnce([]) // First call for schedule-default-calendar-URL returns nothing
        .mockResolvedValueOnce([    // Second call for fallback
          {
            props: {
              "calendar-user-address-set": { href: "https://caldav.example.com/fallback/" }
            }
          }
        ]),
    };
    (createDAVClient as any).mockResolvedValue(mockClient);

    const calendars = await service.listCalendars();
    expect(calendars[0].isDefault).toBe(true);
  });

  it("should throw ErrorWithCode.InternalServerError when no target calendars are found", async () => {
    const { createDAVClient } = await import("tsdav");
    const mockClient = {
      fetchCalendars: vi.fn().mockResolvedValue([]), // No calendars returned
      fetchPrincipalUrl: vi.fn().mockResolvedValue("url"),
      propfind: vi.fn().mockResolvedValue([]),
    };
    (createDAVClient as any).mockResolvedValue(mockClient);

    const event: any = {
      startTime: "2024-01-01T10:00:00Z",
      endTime: "2024-01-01T11:00:00Z",
      organizer: { timeZone: "UTC", email: "m@e.com" },
      attendees: [],
    };

    await expect(service.createEvent(event, 1)).rejects.toThrow(
      new ErrorWithCode(ErrorCode.InternalServerError, "No target calendars found to create CalDAV calendar entry")
    );
  });
});
