import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";

import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { TRPCError } from "@trpc/server";

import { duplicateHandler } from "./duplicate.handler";

const mockCheckSuccessRedirectUrlAllowed = vi.fn();
const mockCreateEventType = vi.fn();

vi.mock("@calcom/prisma", () => ({
  default: prismaMock,
}));
vi.mock("@calcom/features/eventtypes/repositories/eventTypeRepository");
vi.mock("@calcom/features/eventtypes/lib/successRedirectUrlAllowed", () => ({
  checkSuccessRedirectUrlAllowed: (...args: unknown[]) => mockCheckSuccessRedirectUrlAllowed(...args),
}));

describe("duplicateHandler", () => {
  type DuplicateHandlerInput = Parameters<typeof duplicateHandler>[0];
  const ctx = { user: { id: 1, profile: { id: 1 } } } as unknown as DuplicateHandlerInput["ctx"];
  const input = {
    id: 123,
    slug: "test-event",
    title: "Test",
    description: "Test",
    length: 30,
    teamId: null,
  };
  const eventType = {
    id: 123,
    userId: 1,
    teamId: null,
    users: [{ id: 1 }],
    successRedirectUrl: null,
    customInputs: [],
    locations: [],
    team: null,
    hosts: [],
    recurringEvent: null,
    bookingLimits: null,
    durationLimits: null,
    eventTypeColor: null,
    customReplyToEmail: null,
    metadata: null,
    workflows: [],
    hashedLink: [],
    destinationCalendar: null,
    webhooks: [],
    schedule: null,
    secondaryEmailId: null,
    instantMeetingScheduleId: null,
    restrictionScheduleId: null,
    calVideoSettings: null,
    bookingFields: null,
    rrSegmentQueryValue: null,
    assignRRMembersUsingSegment: false,
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    const { EventTypeRepository } = await import(
      "@calcom/features/eventtypes/repositories/eventTypeRepository"
    );
    vi.mocked(EventTypeRepository).mockImplementation(function () {
      return {
        create: mockCreateEventType,
      } as unknown as InstanceType<typeof EventTypeRepository>;
    });
    prismaMock.eventType.findUnique.mockResolvedValue(eventType);
    mockCheckSuccessRedirectUrlAllowed.mockResolvedValue({ allowed: true });
    mockCreateEventType.mockResolvedValue({ id: 999, teamId: null });
  });

  it("should duplicate but clear successRedirectUrl when user is not allowed to use it", async () => {
    const reason =
      "Redirect on booking is a feature for team plan users. Please upgrade to a team plan to use this feature.";
    prismaMock.eventType.findUnique.mockResolvedValue({
      ...eventType,
      successRedirectUrl: "https://cal.com/redirect",
    });
    mockCheckSuccessRedirectUrlAllowed.mockResolvedValue({
      allowed: false,
      reason,
    });

    await expect(duplicateHandler({ ctx, input })).resolves.toEqual({
      eventType: { id: 999, teamId: null },
    });
    expect(mockCheckSuccessRedirectUrlAllowed).toHaveBeenCalledWith({ userId: 1 });
    expect(mockCreateEventType).toHaveBeenCalledWith(
      expect.objectContaining({
        successRedirectUrl: null,
      })
    );
  });

  it("should throw INTERNAL_SERVER_ERROR in case of unique constraint violation", async () => {
    mockCreateEventType.mockRejectedValue(
      new PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "mockedVersion",
      })
    );

    await expect(duplicateHandler({ ctx, input })).rejects.toThrow(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Error duplicating event type PrismaClientKnownRequestError: Unique constraint failed",
      })
    );
  });
});
