import {
  createBookingScenario,
  getOrganizer,
  getScenarioData,
  mockSuccessfulVideoMeetingCreation,
  TestData,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";
import { makeUserActor } from "@calcom/features/booking-audit/lib/makeActor";
import * as handleConfirmationModule from "@calcom/features/bookings/lib/handleConfirmation";
import { distributedTracing } from "@calcom/lib/tracing/factory";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { confirmHandler } from "@calcom/trpc/server/routers/viewer/bookings/confirm.handler";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/features/bookings/di/BookingEventHandlerService.container", () => {
  const onBookingAccepted = vi.fn().mockResolvedValue(undefined);
  const onBulkBookingsAccepted = vi.fn().mockResolvedValue(undefined);
  const onBookingRejected = vi.fn().mockResolvedValue(undefined);
  const onBulkBookingsRejected = vi.fn().mockResolvedValue(undefined);

  const mockService = {
    onBookingAccepted,
    onBulkBookingsAccepted,
    onBookingRejected,
    onBulkBookingsRejected,
  };

  return {
    getBookingEventHandlerService: vi.fn(() => mockService),
  };
});

describe("confirmHandler race validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should allow exactly one successful confirmation for ten concurrent requests", async () => {
    vi.setSystemTime("2050-01-07T00:00:00Z");

    const attendeeUser = getOrganizer({
      email: "test@example.com",
      name: "test name",
      id: 102,
      schedules: [TestData.schedules.IstWorkHours],
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
    });

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 1,
            slotInterval: 15,
            length: 15,
            locations: [],
            requiresConfirmation: true,
            users: [{ id: 101 }],
          },
        ],
        bookings: [
          {
            id: 106,
            uid: "concurrencyBooking123",
            eventTypeId: 1,
            status: BookingStatus.PENDING,
            startTime: "2050-01-08T05:00:00.000Z",
            endTime: "2050-01-08T05:15:00.000Z",
            references: [],
            iCalUID: "concurrencyBooking123@Cal.com",
            location: "integrations:daily",
            attendees: [attendeeUser],
            responses: { name: attendeeUser.name, email: attendeeUser.email },
            user: { id: organizer.id },
          },
        ],
        organizer,
        apps: [TestData.apps["daily-video"]],
      })
    );

    mockSuccessfulVideoMeetingCreation({
      metadataLookupKey: "dailyvideo",
    });

    const handleConfirmationSpy = vi.spyOn(handleConfirmationModule, "handleConfirmation");

    const ctx = {
      user: {
        id: organizer.id,
        name: organizer.name,
        timeZone: organizer.timeZone,
        username: organizer.username,
        uuid: "test-uuid-101",
      } as NonNullable<TrpcSessionUser>,
      traceContext: distributedTracing.createTrace("test_confirm_handler_concurrency"),
    };

    const actor = makeUserActor(ctx.user.uuid);

    const requests = Array.from({ length: 10 }, () =>
      confirmHandler({
        ctx,
        input: {
          bookingId: 106,
          confirmed: true,
          reason: "",
          emailsEnabled: true,
          actor,
          actionSource: "WEBAPP",
        },
      })
    );

    const results = await Promise.allSettled(requests);
    const successes = results.filter(
      (result): result is PromiseFulfilledResult<{ message: string; status: BookingStatus }> =>
        result.status === "fulfilled" && result.value.status === BookingStatus.ACCEPTED
    );
    const failures = results.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected"
    );

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(9);
    expect(handleConfirmationSpy).toHaveBeenCalledTimes(1);

    failures.forEach((failure) => {
      expect(failure.reason).toBeInstanceOf(TRPCError);
      expect((failure.reason as TRPCError).code).toBe("BAD_REQUEST");
    });

    const persistedBooking = await prisma.booking.findUnique({
      where: { id: 106 },
      select: {
        status: true,
        references: {
          select: {
            id: true,
          },
        },
      },
    });

    expect(persistedBooking?.status).toBe(BookingStatus.ACCEPTED);
    expect(persistedBooking?.references).toHaveLength(1);
  });
});
