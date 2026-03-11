import { describe, it, vi, expect, beforeEach, afterEach } from "vitest";

import { ErrorWithCode } from "@calcom/lib/errors";

import { setDestinationCalendarHandler } from "./setDestinationCalendar.handler";

const mockSetDestinationCalendar = vi.fn();

vi.mock("@calcom/features/calendars/di/DestinationCalendarService.container", () => ({
  getDestinationCalendarService: () => ({
    setDestinationCalendar: mockSetDestinationCalendar,
  }),
}));

type MockUser = {
  id: number;
  email: string;
  userLevelSelectedCalendars: Array<{
    integration: string;
    externalId: string;
    credentialId: number | null;
    delegationCredentialId?: number | null;
  }>;
};

function createMockUser({
  id,
  email,
  userLevelSelectedCalendars = [],
}: {
  id: number;
  email: string;
  userLevelSelectedCalendars?: MockUser["userLevelSelectedCalendars"];
}): MockUser {
  return { id, email, userLevelSelectedCalendars };
}

describe("setDestinationCalendarHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should delegate to DestinationCalendarService", async () => {
    const mockUser = createMockUser({
      id: 101,
      email: "organizer@example.com",
      userLevelSelectedCalendars: [
        { integration: "google_calendar", externalId: "cal-1", credentialId: null },
      ],
    });

    mockSetDestinationCalendar.mockResolvedValue(undefined);

    await setDestinationCalendarHandler({
      ctx: { user: mockUser },
      input: { integration: "google_calendar", externalId: "cal-1" },
    });

    expect(mockSetDestinationCalendar).toHaveBeenCalledWith({
      userId: 101,
      userEmail: "organizer@example.com",
      userLevelSelectedCalendars: mockUser.userLevelSelectedCalendars,
      integration: "google_calendar",
      externalId: "cal-1",
    });
  });

  it("should propagate errors from the service", async () => {
    const mockUser = createMockUser({ id: 101, email: "organizer@example.com" });
    mockSetDestinationCalendar.mockRejectedValue(
      ErrorWithCode.Factory.Forbidden("You don't have access to event type 999")
    );

    await expect(
      setDestinationCalendarHandler({
        ctx: { user: mockUser },
        input: { integration: "google_calendar", externalId: "cal-1", eventTypeId: 999 },
      })
    ).rejects.toThrow(ErrorWithCode);
  });

  it("should pass eventTypeId to service", async () => {
    const mockUser = createMockUser({ id: 101, email: "organizer@example.com" });
    mockSetDestinationCalendar.mockResolvedValue(undefined);

    await setDestinationCalendarHandler({
      ctx: { user: mockUser },
      input: { integration: "google_calendar", externalId: "cal-1", eventTypeId: 42 },
    });

    expect(mockSetDestinationCalendar).toHaveBeenCalledWith(
      expect.objectContaining({ eventTypeId: 42 })
    );
  });
});
