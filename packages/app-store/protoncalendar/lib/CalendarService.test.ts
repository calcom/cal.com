import { describe, it, expect, vi, beforeEach } from "vitest";
import ProtonCalendarService from "./CalendarService";

// Mock @calcom/lib/crypto
vi.mock("@calcom/lib/crypto", () => {
    const symmetricEncrypt = (text: string, key: string) => `encrypted:${text}`;
    return {
        symmetricEncrypt,
        symmetricDecrypt: (text: string, key: string) => {
            if (text.startsWith("encrypted:")) return text.replace("encrypted:", "");
            return text;
        }
    };
});

// Mock @calcom/dayjs
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
dayjs.extend(isBetween);

vi.mock("@calcom/dayjs", () => ({
    default: dayjs
}));

// Mock logger
vi.mock("@calcom/lib/logger", () => ({
    default: {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
    }
}));

// Mock environment variables
vi.stubEnv("CALENDSO_ENCRYPTION_KEY", "test-key-123");

// Mock fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe("ProtonCalendarService", () => {
    const SAMPLE_ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Proton//Calendar//EN
BEGIN:VEVENT
UID:123
DTSTART:20250501T100000Z
DTEND:20250501T110000Z
SUMMARY:Test Event
END:VEVENT
END:VCALENDAR`;

    const mockCredential = {
        id: 1,
        appId: "proton-calendar",
        type: "proton_calendar",
        userId: 1,
        teamId: null,
        key: symmetricEncrypt(JSON.stringify({ url: "https://proton.me/calendar/ics/123" }), "test-key-123"),
        invalid: false,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should decrypt url from credential", () => {
        const service = new ProtonCalendarService(mockCredential);
        // @ts-ignore - accessing private property for testing
        expect(service.url).toBe("https://proton.me/calendar/ics/123");
    });

    it("should fetch and parse availability correctly", async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            text: () => Promise.resolve(SAMPLE_ICS),
        });

        const service = new ProtonCalendarService(mockCredential);
        const busy = await service.getAvailability({
            dateFrom: "2025-05-01T00:00:00Z",
            dateTo: "2025-05-02T00:00:00Z",
            originalDate: new Date(),
        });

        expect(busy.length).toBe(1);
        expect(busy[0].start).toContain("2025-05-01T10:00:00");
        expect(busy[0].end).toContain("2025-05-01T11:00:00");
        expect(fetchMock).toHaveBeenCalledWith("https://proton.me/calendar/ics/123");
    });

    it("should expand recurring events correctly", async () => {
        const RECURRING_ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Proton//Calendar//EN
BEGIN:VEVENT
UID:recur123
DTSTART:20250501T090000Z
DTEND:20250501T100000Z
RRULE:FREQ=DAILY;COUNT=3
SUMMARY:Daily Standup
END:VEVENT
END:VCALENDAR`;

        fetchMock.mockResolvedValueOnce({
            ok: true,
            text: () => Promise.resolve(RECURRING_ICS),
        });

        const service = new ProtonCalendarService(mockCredential);
        const busy = await service.getAvailability({
            dateFrom: "2025-05-01T00:00:00Z",
            dateTo: "2025-05-04T00:00:00Z",
        } as any);

        expect(busy.length).toBe(3);
        // May 1
        expect(busy[0].start).toContain("2025-05-01T09:00:00");
        // May 2
        expect(busy[1].start).toContain("2025-05-02T09:00:00");
        // May 3
        expect(busy[2].start).toContain("2025-05-03T09:00:00");
    });

    it("should throw error if encryption key is missing", () => {
        vi.stubEnv("CALENDSO_ENCRYPTION_KEY", "");

        expect(() => {
            new ProtonCalendarService(mockCredential);
        }).toThrow("Missing CALENDSO_ENCRYPTION_KEY");
    });
});
