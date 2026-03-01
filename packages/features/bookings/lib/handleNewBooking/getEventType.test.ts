import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/sentryWrapper", () => ({
  withReporting: (fn: (...args: never[]) => unknown) => fn,
}));

const mockGetDefaultEvent = vi.fn();
vi.mock("@calcom/features/eventtypes/lib/defaultEvents", () => ({
  getDefaultEvent: (...args: unknown[]) => mockGetDefaultEvent(...args),
}));

const mockGetEventTypesFromDB = vi.fn();
vi.mock("./getEventTypesFromDB", () => ({
  getEventTypesFromDB: (...args: unknown[]) => mockGetEventTypesFromDB(...args),
}));

const mockGetBookingFieldsWithSystemFields = vi.fn();
vi.mock("../getBookingFields", () => ({
  getBookingFieldsWithSystemFields: (...args: unknown[]) => mockGetBookingFieldsWithSystemFields(...args),
}));

import { getEventType } from "./getEventType";

describe("getEventType", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBookingFieldsWithSystemFields.mockReturnValue([{ name: "name", type: "name" }]);
  });

  it("throws HttpError when neither eventTypeId nor eventTypeSlug is provided", async () => {
    await expect(getEventType({ eventTypeId: 0, eventTypeSlug: undefined })).rejects.toThrow(
      "Either eventTypeId or eventTypeSlug must be provided"
    );
  });

  it("fetches event type from DB when eventTypeId is provided", async () => {
    const mockEventType = {
      id: 1,
      title: "Test Event",
      team: null,
    };
    mockGetEventTypesFromDB.mockResolvedValue(mockEventType);

    const result = await getEventType({ eventTypeId: 1 });

    expect(mockGetEventTypesFromDB).toHaveBeenCalledWith(1);
    expect(mockGetDefaultEvent).not.toHaveBeenCalled();
    expect(result.bookingFields).toEqual([{ name: "name", type: "name" }]);
  });

  it("uses default event when only eventTypeSlug is provided", async () => {
    const mockDefaultEvent = {
      title: "Dynamic Event",
      team: null,
    };
    mockGetDefaultEvent.mockReturnValue(mockDefaultEvent);

    const result = await getEventType({ eventTypeId: 0, eventTypeSlug: "dynamic-slug" });

    expect(mockGetDefaultEvent).toHaveBeenCalledWith("dynamic-slug");
    expect(mockGetEventTypesFromDB).not.toHaveBeenCalled();
    expect(result.title).toBe("Dynamic Event");
  });

  it("prefers DB lookup when both eventTypeId and eventTypeSlug are provided", async () => {
    const mockEventType = { id: 5, title: "DB Event", team: null };
    mockGetEventTypesFromDB.mockResolvedValue(mockEventType);

    const result = await getEventType({ eventTypeId: 5, eventTypeSlug: "some-slug" });

    expect(mockGetEventTypesFromDB).toHaveBeenCalledWith(5);
    expect(mockGetDefaultEvent).not.toHaveBeenCalled();
    expect(result.title).toBe("DB Event");
  });

  it("sets isOrgTeamEvent correctly for team with parentId", async () => {
    const mockEventType = {
      id: 1,
      title: "Org Team Event",
      team: { id: 10, parentId: 5 },
    };
    mockGetEventTypesFromDB.mockResolvedValue(mockEventType);

    await getEventType({ eventTypeId: 1 });

    expect(mockGetBookingFieldsWithSystemFields).toHaveBeenCalledWith(
      expect.objectContaining({ isOrgTeamEvent: true })
    );
  });

  it("sets isOrgTeamEvent=false for team without parentId", async () => {
    const mockEventType = {
      id: 1,
      title: "Team Event",
      team: { id: 10, parentId: null },
    };
    mockGetEventTypesFromDB.mockResolvedValue(mockEventType);

    await getEventType({ eventTypeId: 1 });

    expect(mockGetBookingFieldsWithSystemFields).toHaveBeenCalledWith(
      expect.objectContaining({ isOrgTeamEvent: false })
    );
  });

  it("sets isOrgTeamEvent=false when there is no team", async () => {
    const mockEventType = { id: 1, title: "Solo Event", team: null };
    mockGetEventTypesFromDB.mockResolvedValue(mockEventType);

    await getEventType({ eventTypeId: 1 });

    expect(mockGetBookingFieldsWithSystemFields).toHaveBeenCalledWith(
      expect.objectContaining({ isOrgTeamEvent: false })
    );
  });
});
