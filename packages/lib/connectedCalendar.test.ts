import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindMany = vi.fn();
const mockUpdateMany = vi.fn();

vi.mock("@calcom/prisma", () => ({
  default: {
    selectedCalendar: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
    },
  },
}));

import { renewSelectedCalendarCredentialId } from "./connectedCalendar";

describe("renewSelectedCalendarCredentialId", () => {
  beforeEach(() => {
    mockFindMany.mockReset();
    mockUpdateMany.mockReset();
  });

  it("returns false when no calendars found with null credentialId", async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await renewSelectedCalendarCredentialId(
      { userId: 1, integration: "google_calendar", externalId: "ext-1" },
      100
    );

    expect(result).toBe(false);
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it("queries for calendars with null credentialId", async () => {
    mockFindMany.mockResolvedValue([]);

    await renewSelectedCalendarCredentialId(
      { userId: 5, integration: "office365_calendar", externalId: "ext-abc" },
      200
    );

    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        userId: 5,
        integration: "office365_calendar",
        externalId: "ext-abc",
        credentialId: null,
      },
    });
  });

  it("updates all found calendars with new credentialId and returns true", async () => {
    mockFindMany.mockResolvedValue([
      { id: 10, userId: 1, integration: "google_calendar", externalId: "ext-1" },
      { id: 11, userId: 1, integration: "google_calendar", externalId: "ext-1" },
    ]);
    mockUpdateMany.mockResolvedValue({ count: 2 });

    const result = await renewSelectedCalendarCredentialId(
      { userId: 1, integration: "google_calendar", externalId: "ext-1" },
      300
    );

    expect(result).toBe(true);
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: {
        id: { in: [10, 11] },
      },
      data: {
        credentialId: 300,
      },
    });
  });

  it("updates single calendar when only one found", async () => {
    mockFindMany.mockResolvedValue([{ id: 42, userId: 2, integration: "apple_calendar", externalId: "e" }]);
    mockUpdateMany.mockResolvedValue({ count: 1 });

    const result = await renewSelectedCalendarCredentialId(
      { userId: 2, integration: "apple_calendar", externalId: "e" },
      50
    );

    expect(result).toBe(true);
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: [42] } },
      data: { credentialId: 50 },
    });
  });
});
