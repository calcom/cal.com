import { ErrorCode } from "@calcom/lib/errorCodes";
import { BookingStatus } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/prisma", () => ({
  default: {
    booking: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@calcom/features/bookings/lib/handleWebhookTrigger", () => ({
  handleWebhookTrigger: vi.fn(),
}));

vi.mock("@calcom/features/ee/billing/credit-service", () => ({
  CreditService: class {
    hasAvailableCredits = vi.fn().mockResolvedValue(true);
  },
}));

vi.mock("@calcom/features/ee/workflows/lib/service/WorkflowService", () => ({
  WorkflowService: {
    scheduleWorkflowsForNewBooking: vi.fn(),
  },
}));

vi.mock("./create/createNewSeat", () => ({
  default: vi.fn(),
}));

vi.mock("./reschedule/rescheduleSeatedBooking", () => ({
  default: vi.fn(),
}));

vi.mock("../handleNewBooking/logger", () => ({
  createLoggerWithEventDetails: vi.fn().mockReturnValue({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock("../handleNewBooking/getBookingAuditActorForNewBooking", () => ({
  getBookingAuditActorForNewBooking: vi.fn().mockReturnValue({
    type: "user",
    uuid: "test-uuid",
  }),
}));

import type { FeaturesRepository } from "@calcom/features/flags/features.repository";
import prisma from "@calcom/prisma";
import createNewSeat from "./create/createNewSeat";
import handleSeats from "./handleSeats";
import rescheduleSeatedBooking from "./reschedule/rescheduleSeatedBooking";
import type { NewSeatedBookingObject, SeatedBooking } from "./types";

const mockPrisma = vi.mocked(prisma);
const mockCreateNewSeat = vi.mocked(createNewSeat);
const mockRescheduleSeatedBooking = vi.mocked(rescheduleSeatedBooking);

function createMockFeaturesRepository(): FeaturesRepository {
  return {
    checkIfTeamHasFeature: vi.fn().mockResolvedValue(false),
    checkIfUserHasFeature: vi.fn().mockResolvedValue(false),
  } as unknown as FeaturesRepository;
}

function createMinimalBookingObject(overrides: Partial<NewSeatedBookingObject> = {}): NewSeatedBookingObject {
  return {
    rescheduleUid: undefined,
    reqBookingUid: undefined,
    eventType: {
      id: 1,
      slug: "test-event",
      length: 30,
      seatsPerTimeSlot: 3,
      schedulingType: null,
      hosts: [],
      workflows: [],
    } as unknown as NewSeatedBookingObject["eventType"],
    evt: {
      startTime: "2024-01-15T10:00:00Z",
      endTime: "2024-01-15T10:30:00Z",
      title: "Test Event",
      type: "test",
      organizer: {
        email: "organizer@test.com",
        name: "Organizer",
        timeZone: "UTC",
        language: {
          translate: ((s: string) => s) as unknown as NewSeatedBookingObject["tAttendees"],
          locale: "en",
        },
      },
      attendees: [],
      bookerUrl: "https://cal.com",
      requiresConfirmation: false,
    } as unknown as NewSeatedBookingObject["evt"],
    invitee: [
      {
        email: "attendee@test.com",
        name: "Attendee",
        firstName: "Attendee",
        lastName: "",
        timeZone: "UTC",
        language: {
          translate: ((s: string) => s) as unknown as NewSeatedBookingObject["tAttendees"],
          locale: "en",
        },
      },
    ],
    allCredentials: [],
    organizerUser: {} as NewSeatedBookingObject["organizerUser"],
    originalRescheduledBooking: null as unknown as NewSeatedBookingObject["originalRescheduledBooking"],
    bookerEmail: "attendee@test.com",
    tAttendees: ((s: string) => s) as unknown as NewSeatedBookingObject["tAttendees"],
    bookingSeat: null,
    reqUserId: undefined,
    rescheduleReason: undefined,
    reqBodyUser: "attendee",
    noEmail: undefined,
    isConfirmedByDefault: true,
    additionalNotes: "",
    reqAppsStatus: undefined,
    attendeeLanguage: "en",
    paymentAppData: {} as NewSeatedBookingObject["paymentAppData"],
    fullName: "Attendee",
    smsReminderNumber: undefined,
    eventTypeInfo: {
      eventTitle: "Test Event",
      eventDescription: null,
      length: 30,
    } as unknown as NewSeatedBookingObject["eventTypeInfo"],
    uid: "test-uid" as NewSeatedBookingObject["uid"],
    eventTypeId: 1,
    reqBodyMetadata: {},
    subscriberOptions: {} as NewSeatedBookingObject["subscriberOptions"],
    eventTrigger: "BOOKING_CREATED" as unknown as NewSeatedBookingObject["eventTrigger"],
    responses: null,
    workflows: [],
    isDryRun: false,
    organizationId: null,
    actionSource: { type: "booking-engine" } as unknown as NewSeatedBookingObject["actionSource"],
    traceContext: {},
    deps: {
      bookingEventHandler: {
        onSeatBooked: vi.fn(),
        onSeatRescheduled: vi.fn(),
      } as unknown as NewSeatedBookingObject["deps"]["bookingEventHandler"],
    },
    ...overrides,
  } as NewSeatedBookingObject;
}

function createMockSeatedBooking(overrides: Partial<SeatedBooking> = {}): SeatedBooking {
  return {
    uid: "existing-booking-uid",
    id: 1,
    attendees: [],
    userId: 101,
    references: [],
    startTime: new Date("2024-01-15T10:00:00Z"),
    user: { id: 101, email: "organizer@test.com" },
    status: BookingStatus.ACCEPTED,
    smsReminderNumber: null,
    endTime: new Date("2024-01-15T10:30:00Z"),
    ...overrides,
  } as SeatedBooking;
}

describe("handleSeats unit tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("dry run", () => {
    it("returns undefined immediately when isDryRun is true", async () => {
      const bookingObject = createMinimalBookingObject({ isDryRun: true });
      const featuresRepo = createMockFeaturesRepository();

      const result = await handleSeats(bookingObject, featuresRepo);

      expect(result).toBeUndefined();
      expect(mockPrisma.booking.findFirst).not.toHaveBeenCalled();
    });
  });

  describe("booking lookup", () => {
    it("throws BookingNotFound when no seated booking exists and rescheduleUid is set", async () => {
      const bookingObject = createMinimalBookingObject({
        rescheduleUid: "nonexistent-uid",
      });
      const featuresRepo = createMockFeaturesRepository();

      mockPrisma.booking.findFirst.mockResolvedValue(null);

      await expect(handleSeats(bookingObject, featuresRepo)).rejects.toThrow(
        expect.objectContaining({
          statusCode: 404,
          message: ErrorCode.BookingNotFound,
        })
      );
    });

    it("returns undefined when no seated booking exists and no rescheduleUid", async () => {
      const bookingObject = createMinimalBookingObject();
      const featuresRepo = createMockFeaturesRepository();

      mockPrisma.booking.findFirst.mockResolvedValue(null);

      const result = await handleSeats(bookingObject, featuresRepo);

      expect(result).toBeUndefined();
    });
  });

  describe("duplicate attendee check", () => {
    it("throws AlreadySignedUpForBooking when attendee email already exists in booking at same time", async () => {
      const startTime = new Date("2024-01-15T10:00:00Z");
      // dayjs.utc(startTime).format() produces "2024-01-15T10:00:00Z", so evt.startTime must match
      const bookingObject = createMinimalBookingObject({
        evt: {
          startTime: "2024-01-15T10:00:00Z",
        } as unknown as NewSeatedBookingObject["evt"],
        invitee: [
          {
            email: "duplicate@test.com",
            name: "Duplicate",
            firstName: "Duplicate",
            lastName: "",
            timeZone: "UTC",
            language: {
              translate: ((s: string) => s) as unknown as NewSeatedBookingObject["tAttendees"],
              locale: "en",
            },
          },
        ],
      });
      const featuresRepo = createMockFeaturesRepository();

      const seatedBooking = createMockSeatedBooking({
        startTime,
        attendees: [{ email: "duplicate@test.com", name: "Duplicate" }] as SeatedBooking["attendees"],
      });

      mockPrisma.booking.findFirst.mockResolvedValue(seatedBooking);

      await expect(handleSeats(bookingObject, featuresRepo)).rejects.toThrow(
        expect.objectContaining({
          statusCode: 409,
          message: ErrorCode.AlreadySignedUpForBooking,
        })
      );
    });

    it("does not throw when same attendee books a different time slot", async () => {
      const bookingObject = createMinimalBookingObject({
        evt: {
          startTime: "2024-01-15T11:00:00Z",
        } as unknown as NewSeatedBookingObject["evt"],
        invitee: [
          {
            email: "attendee@test.com",
            name: "Attendee",
            firstName: "Attendee",
            lastName: "",
            timeZone: "UTC",
            language: {
              translate: ((s: string) => s) as unknown as NewSeatedBookingObject["tAttendees"],
              locale: "en",
            },
          },
        ],
      });
      const featuresRepo = createMockFeaturesRepository();

      const seatedBooking = createMockSeatedBooking({
        startTime: new Date("2024-01-15T10:00:00Z"),
        attendees: [{ email: "attendee@test.com", name: "Attendee" }] as SeatedBooking["attendees"],
      });

      mockPrisma.booking.findFirst.mockResolvedValue(seatedBooking);
      mockCreateNewSeat.mockResolvedValue(null);

      await expect(handleSeats(bookingObject, featuresRepo)).resolves.not.toThrow();
    });
  });

  describe("routing", () => {
    it("calls rescheduleSeatedBooking when rescheduleUid is provided", async () => {
      const bookingObject = createMinimalBookingObject({
        rescheduleUid: "reschedule-uid",
      });
      const featuresRepo = createMockFeaturesRepository();

      const seatedBooking = createMockSeatedBooking();
      mockPrisma.booking.findFirst.mockResolvedValue(seatedBooking);
      mockRescheduleSeatedBooking.mockResolvedValue(null);

      await handleSeats(bookingObject, featuresRepo);

      expect(mockRescheduleSeatedBooking).toHaveBeenCalledTimes(1);
      expect(mockCreateNewSeat).not.toHaveBeenCalled();
    });

    it("calls createNewSeat when no rescheduleUid is provided", async () => {
      const bookingObject = createMinimalBookingObject({
        rescheduleUid: undefined,
      });
      const featuresRepo = createMockFeaturesRepository();

      const seatedBooking = createMockSeatedBooking();
      mockPrisma.booking.findFirst.mockResolvedValue(seatedBooking);
      mockCreateNewSeat.mockResolvedValue(null);

      await handleSeats(bookingObject, featuresRepo);

      expect(mockCreateNewSeat).toHaveBeenCalledTimes(1);
      expect(mockRescheduleSeatedBooking).not.toHaveBeenCalled();
    });
  });

  describe("booking query", () => {
    it("queries by rescheduleUid OR reqBookingUid when available", async () => {
      const bookingObject = createMinimalBookingObject({
        rescheduleUid: "uid-1",
        reqBookingUid: "uid-2",
      });
      const featuresRepo = createMockFeaturesRepository();

      mockPrisma.booking.findFirst.mockResolvedValue(null);

      try {
        await handleSeats(bookingObject, featuresRepo);
      } catch {
        // Expected to throw BookingNotFound
      }

      expect(mockPrisma.booking.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([expect.objectContaining({ uid: "uid-1" })]),
            status: BookingStatus.ACCEPTED,
          }),
        })
      );
    });

    it("queries by eventTypeId and startTime in OR clause", async () => {
      const bookingObject = createMinimalBookingObject();
      const featuresRepo = createMockFeaturesRepository();

      mockPrisma.booking.findFirst.mockResolvedValue(null);

      await handleSeats(bookingObject, featuresRepo);

      expect(mockPrisma.booking.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                eventTypeId: 1,
                startTime: expect.any(Date),
              }),
            ]),
          }),
        })
      );
    });
  });

  describe("post-booking workflows and webhooks", () => {
    it("triggers workflows and webhooks when resultBooking is returned", async () => {
      const { WorkflowService } = await import("@calcom/features/ee/workflows/lib/service/WorkflowService");
      const { handleWebhookTrigger } = await import("@calcom/features/bookings/lib/handleWebhookTrigger");

      const bookingObject = createMinimalBookingObject({
        workflows: [],
      });
      const featuresRepo = createMockFeaturesRepository();

      const seatedBooking = createMockSeatedBooking();
      mockPrisma.booking.findFirst.mockResolvedValue(seatedBooking);

      const resultBooking = {
        uid: "result-uid",
        seatReferenceUid: "seat-ref-uid",
        attendees: [{ email: "attendee@test.com", id: 1 }],
        startTime: new Date("2024-01-15T10:00:00Z"),
        endTime: new Date("2024-01-15T10:30:00Z"),
      };
      mockCreateNewSeat.mockResolvedValue(resultBooking);

      await handleSeats(bookingObject, featuresRepo);

      expect(WorkflowService.scheduleWorkflowsForNewBooking).toHaveBeenCalled();
      expect(handleWebhookTrigger).toHaveBeenCalled();
    });

    it("does not trigger workflows or webhooks when resultBooking is null", async () => {
      const { WorkflowService } = await import("@calcom/features/ee/workflows/lib/service/WorkflowService");
      const { handleWebhookTrigger } = await import("@calcom/features/bookings/lib/handleWebhookTrigger");

      const bookingObject = createMinimalBookingObject();
      const featuresRepo = createMockFeaturesRepository();

      const seatedBooking = createMockSeatedBooking();
      mockPrisma.booking.findFirst.mockResolvedValue(seatedBooking);
      mockCreateNewSeat.mockResolvedValue(null);

      await handleSeats(bookingObject, featuresRepo);

      expect(WorkflowService.scheduleWorkflowsForNewBooking).not.toHaveBeenCalled();
      expect(handleWebhookTrigger).not.toHaveBeenCalled();
    });
  });

  describe("webhook payload construction", () => {
    it("includes reschedule times in webhook payload when rescheduling", async () => {
      const { handleWebhookTrigger } = await import("@calcom/features/bookings/lib/handleWebhookTrigger");
      const mockHandleWebhookTrigger = vi.mocked(handleWebhookTrigger);

      const bookingObject = createMinimalBookingObject({
        rescheduleUid: "reschedule-uid",
        originalRescheduledBooking: {
          startTime: new Date("2024-01-14T10:00:00Z"),
          endTime: new Date("2024-01-14T10:30:00Z"),
          attendees: [],
          references: [],
        } as unknown as NewSeatedBookingObject["originalRescheduledBooking"],
      });
      const featuresRepo = createMockFeaturesRepository();

      const seatedBooking = createMockSeatedBooking();
      mockPrisma.booking.findFirst.mockResolvedValue(seatedBooking);

      const resultBooking = {
        uid: "result-uid",
        seatReferenceUid: "seat-ref-uid",
        attendees: [{ email: "attendee@test.com", id: 1 }],
      };
      mockRescheduleSeatedBooking.mockResolvedValue(resultBooking);

      await handleSeats(bookingObject, featuresRepo);

      expect(mockHandleWebhookTrigger).toHaveBeenCalledWith(
        expect.objectContaining({
          webhookData: expect.objectContaining({
            rescheduleUid: "reschedule-uid",
            rescheduleStartTime: expect.any(String),
            rescheduleEndTime: expect.any(String),
          }),
        })
      );
    });

    it("includes seatReferenceUid as attendeeSeatId in webhook payload", async () => {
      const { handleWebhookTrigger } = await import("@calcom/features/bookings/lib/handleWebhookTrigger");
      const mockHandleWebhookTrigger = vi.mocked(handleWebhookTrigger);

      const bookingObject = createMinimalBookingObject();
      const featuresRepo = createMockFeaturesRepository();

      const seatedBooking = createMockSeatedBooking();
      mockPrisma.booking.findFirst.mockResolvedValue(seatedBooking);

      const resultBooking = {
        uid: "result-uid",
        seatReferenceUid: "my-seat-ref",
        attendees: [{ email: "attendee@test.com", id: 1 }],
      };
      mockCreateNewSeat.mockResolvedValue(resultBooking);

      await handleSeats(bookingObject, featuresRepo);

      expect(mockHandleWebhookTrigger).toHaveBeenCalledWith(
        expect.objectContaining({
          webhookData: expect.objectContaining({
            attendeeSeatId: "my-seat-ref",
          }),
        })
      );
    });
  });

  describe("attendee phone number for workflows", () => {
    it("uses invitee phoneNumber for SMS reminders when available", async () => {
      const { WorkflowService } = await import("@calcom/features/ee/workflows/lib/service/WorkflowService");
      const mockSchedule = vi.mocked(WorkflowService.scheduleWorkflowsForNewBooking);

      const bookingObject = createMinimalBookingObject({
        invitee: [
          {
            email: "attendee@test.com",
            name: "Attendee",
            firstName: "Attendee",
            lastName: "",
            timeZone: "UTC",
            phoneNumber: "+15551234567",
            language: {
              translate: ((s: string) => s) as unknown as NewSeatedBookingObject["tAttendees"],
              locale: "en",
            },
          },
        ],
        smsReminderNumber: "+15559999999",
      });
      const featuresRepo = createMockFeaturesRepository();

      const seatedBooking = createMockSeatedBooking();
      mockPrisma.booking.findFirst.mockResolvedValue(seatedBooking);

      const resultBooking = {
        uid: "result-uid",
        seatReferenceUid: "seat-ref",
        attendees: [{ email: "attendee@test.com", id: 1 }],
      };
      mockCreateNewSeat.mockResolvedValue(resultBooking);

      await handleSeats(bookingObject, featuresRepo);

      expect(mockSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          smsReminderNumber: "+15551234567",
        })
      );
    });

    it("falls back to smsReminderNumber when invitee has no phoneNumber", async () => {
      const { WorkflowService } = await import("@calcom/features/ee/workflows/lib/service/WorkflowService");
      const mockSchedule = vi.mocked(WorkflowService.scheduleWorkflowsForNewBooking);

      const bookingObject = createMinimalBookingObject({
        invitee: [
          {
            email: "attendee@test.com",
            name: "Attendee",
            firstName: "Attendee",
            lastName: "",
            timeZone: "UTC",
            language: {
              translate: ((s: string) => s) as unknown as NewSeatedBookingObject["tAttendees"],
              locale: "en",
            },
          },
        ],
        smsReminderNumber: "+15559999999",
      });
      const featuresRepo = createMockFeaturesRepository();

      const seatedBooking = createMockSeatedBooking();
      mockPrisma.booking.findFirst.mockResolvedValue(seatedBooking);

      const resultBooking = {
        uid: "result-uid",
        seatReferenceUid: "seat-ref",
        attendees: [{ email: "attendee@test.com", id: 1 }],
      };
      mockCreateNewSeat.mockResolvedValue(resultBooking);

      await handleSeats(bookingObject, featuresRepo);

      expect(mockSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          smsReminderNumber: "+15559999999",
        })
      );
    });
  });
});
