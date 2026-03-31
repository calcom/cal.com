import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { ErrorWithCode } from "@calcom/lib/errors";
import { HttpError } from "@calcom/lib/http-error";
import type { Logger } from "tslog";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingDataPreparationService } from "./BookingDataPreparationService";

vi.mock("../handleNewBooking/getEventType", () => ({
  getEventType: vi.fn(),
}));

vi.mock("../handleNewBooking/getBookingData", () => ({
  getBookingData: vi.fn(),
}));

vi.mock("../handleNewBooking/checkIfBookerEmailIsBlocked", () => ({
  checkIfBookerEmailIsBlocked: vi.fn(),
}));

vi.mock("../handleNewBooking/checkActiveBookingsLimitForBooker", () => ({
  checkActiveBookingsLimitForBooker: vi.fn(),
}));

vi.mock("../handleNewBooking/validateBookingTimeIsNotOutOfBounds", () => ({
  validateBookingTimeIsNotOutOfBounds: vi.fn(),
}));

vi.mock("../handleNewBooking/validateEventLength", () => ({
  validateEventLength: vi.fn(),
}));

vi.mock("../handleNewBooking/validateRescheduleRestrictions", () => ({
  validateRescheduleRestrictions: vi.fn(),
}));

vi.mock("@calcom/features/auth/lib/verifyCodeUnAuthenticated", () => ({
  verifyCodeUnAuthenticated: vi.fn(),
}));

vi.mock("@calcom/features/ee/billing/di/containers/Billing", () => ({
  getDunningGuard: vi.fn(() => ({
    canPerformAction: vi.fn().mockResolvedValue({ allowed: true }),
  })),
}));

vi.mock("@calcom/features/di/watchlist/containers/SpamCheckService.container", () => ({
  getSpamCheckService: vi.fn(() => ({
    startCheck: vi.fn(),
  })),
}));

vi.mock("@calcom/features/profile/repositories/ProfileRepository", () => ({
  ProfileRepository: {
    findFirstForUserId: vi.fn(),
  },
}));

import { verifyCodeUnAuthenticated } from "@calcom/features/auth/lib/verifyCodeUnAuthenticated";
import { getSpamCheckService } from "@calcom/features/di/watchlist/containers/SpamCheckService.container";
import { getDunningGuard } from "@calcom/features/ee/billing/di/containers/Billing";
import { checkActiveBookingsLimitForBooker } from "../handleNewBooking/checkActiveBookingsLimitForBooker";
import { checkIfBookerEmailIsBlocked } from "../handleNewBooking/checkIfBookerEmailIsBlocked";
import { getBookingData } from "../handleNewBooking/getBookingData";
import { getEventType } from "../handleNewBooking/getEventType";
import { validateBookingTimeIsNotOutOfBounds } from "../handleNewBooking/validateBookingTimeIsNotOutOfBounds";
import { validateEventLength } from "../handleNewBooking/validateEventLength";

describe("BookingDataPreparationService", () => {
  let service: BookingDataPreparationService;
  let mockLogger: Logger<unknown>;
  let mockBookingRepository: BookingRepository;
  let mockUserRepository: UserRepository;

  const createMockEventType = (overrides = {}) => ({
    id: 1,
    slug: "test-event",
    title: "Test Event",
    length: 30,
    userId: 101,
    schedulingType: null,
    seatsPerTimeSlot: null,
    recurringEvent: null,
    requiresBookerEmailVerification: false,
    maxActiveBookingsPerBooker: null,
    maxActiveBookingPerBookerOfferReschedule: false,
    schedule: null,
    users: [
      {
        id: 101,
        schedules: [{ id: 1, timeZone: "America/New_York" }],
        defaultScheduleId: 1,
      },
    ],
    team: null,
    parent: null,
    bookingFields: [],
    metadata: {},
    ...overrides,
  });

  const createMockBookingData = (overrides = {}) => ({
    name: "Test Booker",
    email: "booker@example.com",
    attendeePhoneNumber: null,
    timeZone: "America/New_York",
    smsReminderNumber: null,
    language: "en",
    location: "integrations:daily",
    notes: "Test notes",
    start: "2024-01-15T10:00:00.000Z",
    end: "2024-01-15T10:30:00.000Z",
    guests: [],
    rescheduleReason: null,
    rescheduleUid: null,
    rescheduledBy: null,
    responses: {},
    calEventResponses: {},
    calEventUserFieldsResponses: {},
    customInputs: {},
    metadata: {},
    creationSource: null,
    tracking: {},
    routedTeamMemberIds: null,
    reroutingFormResponses: null,
    routingFormResponseId: null,
    teamMemberEmail: null,
    crmRecordId: null,
    crmOwnerRecordType: null,
    crmAppSlug: null,
    skipContactOwner: null,
    appsStatus: undefined,
    hasHashedBookingLink: false,
    hashedLink: null,
    luckyUsers: [],
    allRecurringDates: null,
    recurringCount: 0,
    isFirstRecurringSlot: false,
    numSlotsToCheckForAvailability: 0,
    recurringEventId: null,
    thirdPartyRecurringEventId: null,
    bookingUid: null,
    user: "test-user",
    _isDryRun: false,
    ...overrides,
  });

  const createMockRawBookingData = (overrides = {}) => ({
    eventTypeId: 1,
    eventTypeSlug: "test-event",
    start: "2024-01-15T10:00:00.000Z",
    end: "2024-01-15T10:30:00.000Z",
    timeZone: "America/New_York",
    language: "en",
    metadata: {},
    responses: {
      name: "Test Booker",
      email: "booker@example.com",
    },
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger<unknown>;

    mockBookingRepository = {
      countActiveBookingsForEventType: vi.fn(),
      findActiveBookingsForEventType: vi.fn(),
    } as unknown as BookingRepository;

    mockUserRepository = {
      findVerifiedUserByEmail: vi.fn(),
    } as unknown as UserRepository;

    service = new BookingDataPreparationService({
      log: mockLogger,
      bookingRepository: mockBookingRepository,
      userRepository: mockUserRepository,
    });

    vi.mocked(getEventType).mockResolvedValue(createMockEventType());
    vi.mocked(getBookingData).mockResolvedValue(createMockBookingData());
    vi.mocked(checkIfBookerEmailIsBlocked).mockResolvedValue(undefined);
    vi.mocked(checkActiveBookingsLimitForBooker).mockResolvedValue(undefined);
    vi.mocked(validateBookingTimeIsNotOutOfBounds).mockResolvedValue(undefined);
    vi.mocked(validateEventLength).mockReturnValue(undefined);
  });

  describe("enrich", () => {
    it("should fetch and transform booking data successfully", async () => {
      const mockSchemaGetter = vi.fn().mockReturnValue({});

      const result = await service.enrich(
        {
          rawBookingData: createMockRawBookingData(),
          rawBookingMeta: {},
          eventType: { id: 1, slug: "test-event" },
          loggedInUserId: null,
        },
        mockSchemaGetter
      );

      expect(result).toHaveProperty("eventType");
      expect(result).toHaveProperty("bookingFormData");
      expect(result).toHaveProperty("loggedInUser");
      expect(result).toHaveProperty("routingData");
      expect(result).toHaveProperty("bookingMeta");
      expect(result).toHaveProperty("config");
      expect(result).toHaveProperty("spamCheckService");
      expect(result.eventType.id).toBe(1);
      expect(result.bookingFormData.booker.email).toBe("booker@example.com");
    });

    it("should throw error when event type is not found", async () => {
      vi.mocked(getEventType).mockResolvedValue(null);
      const mockSchemaGetter = vi.fn().mockReturnValue({});

      await expect(
        service.enrich(
          {
            rawBookingData: createMockRawBookingData(),
            rawBookingMeta: {},
            eventType: { id: 999, slug: "nonexistent" },
            loggedInUserId: null,
          },
          mockSchemaGetter
        )
      ).rejects.toThrow("event_type_not_found");
    });

    it("should mark event type as team event when schedulingType is COLLECTIVE", async () => {
      vi.mocked(getEventType).mockResolvedValue(createMockEventType({ schedulingType: "COLLECTIVE" }));
      const mockSchemaGetter = vi.fn().mockReturnValue({});

      const result = await service.enrich(
        {
          rawBookingData: createMockRawBookingData(),
          rawBookingMeta: {},
          eventType: { id: 1, slug: "test-event" },
          loggedInUserId: null,
        },
        mockSchemaGetter
      );

      expect(result.eventType.isTeamEventType).toBe(true);
    });

    it("should mark event type as team event when schedulingType is ROUND_ROBIN", async () => {
      vi.mocked(getEventType).mockResolvedValue(createMockEventType({ schedulingType: "ROUND_ROBIN" }));
      const mockSchemaGetter = vi.fn().mockReturnValue({});

      const result = await service.enrich(
        {
          rawBookingData: createMockRawBookingData(),
          rawBookingMeta: {},
          eventType: { id: 1, slug: "test-event" },
          loggedInUserId: null,
        },
        mockSchemaGetter
      );

      expect(result.eventType.isTeamEventType).toBe(true);
    });

    it("should include platform metadata when provided", async () => {
      const mockSchemaGetter = vi.fn().mockReturnValue({});

      const result = await service.enrich(
        {
          rawBookingData: createMockRawBookingData(),
          rawBookingMeta: {
            platformClientId: "test-client",
            platformRescheduleUrl: "https://example.com/reschedule",
            platformCancelUrl: "https://example.com/cancel",
            platformBookingUrl: "https://example.com/booking",
          },
          eventType: { id: 1, slug: "test-event" },
          loggedInUserId: null,
        },
        mockSchemaGetter
      );

      expect(result.bookingMeta.platform).toEqual({
        clientId: "test-client",
        rescheduleUrl: "https://example.com/reschedule",
        cancelUrl: "https://example.com/cancel",
        bookingUrl: "https://example.com/booking",
        bookingLocation: null,
      });
    });
  });

  describe("validate", () => {
    it("should pass validation for valid booking data", async () => {
      const mockSchemaGetter = vi.fn().mockReturnValue({});
      const preparedData = await service.enrich(
        {
          rawBookingData: createMockRawBookingData(),
          rawBookingMeta: {},
          eventType: { id: 1, slug: "test-event" },
          loggedInUserId: null,
        },
        mockSchemaGetter
      );

      await expect(service.validate(preparedData, createMockRawBookingData())).resolves.toBeUndefined();
    });

    it("should throw 403 when team is in dunning state", async () => {
      const mockCanPerformAction = vi.fn().mockResolvedValue({ allowed: false });
      vi.mocked(getDunningGuard).mockReturnValue({
        canPerformAction: mockCanPerformAction,
      } as unknown as ReturnType<typeof getDunningGuard>);

      vi.mocked(getEventType).mockResolvedValue(
        createMockEventType({
          teamId: 10,
          team: {
            id: 10,
            name: "Test Team",
            parentId: null,
            bookingLimits: null,
            includeManagedEventsInLimits: false,
            rrResetInterval: null,
            rrTimestampBasis: null,
            hideBranding: false,
            parent: null,
          },
        })
      );
      const mockSchemaGetter = vi.fn().mockReturnValue({});

      const preparedData = await service.enrich(
        {
          rawBookingData: createMockRawBookingData(),
          rawBookingMeta: {},
          eventType: { id: 1, slug: "test-event" },
          loggedInUserId: null,
        },
        mockSchemaGetter
      );

      await expect(service.validate(preparedData, createMockRawBookingData())).rejects.toThrow(ErrorWithCode);

      expect(mockCanPerformAction).toHaveBeenCalledWith(10, "CREATE_BOOKING");
    });

    it("should use parentId as billingTeamId when team has a parent", async () => {
      const mockCanPerformAction = vi.fn().mockResolvedValue({ allowed: true });
      vi.mocked(getDunningGuard).mockReturnValue({
        canPerformAction: mockCanPerformAction,
      } as unknown as ReturnType<typeof getDunningGuard>);

      vi.mocked(getEventType).mockResolvedValue(
        createMockEventType({
          teamId: 10,
          team: {
            id: 10,
            name: "Test Team",
            parentId: 5,
            bookingLimits: null,
            includeManagedEventsInLimits: false,
            rrResetInterval: null,
            rrTimestampBasis: null,
            hideBranding: false,
            parent: null,
          },
        })
      );
      const mockSchemaGetter = vi.fn().mockReturnValue({});

      const preparedData = await service.enrich(
        {
          rawBookingData: createMockRawBookingData(),
          rawBookingMeta: {},
          eventType: { id: 1, slug: "test-event" },
          loggedInUserId: null,
        },
        mockSchemaGetter
      );

      await service.validate(preparedData, createMockRawBookingData());

      expect(mockCanPerformAction).toHaveBeenCalledWith(5, "CREATE_BOOKING");
    });

    it("should skip dunning check for non-team event types", async () => {
      const mockCanPerformAction = vi.fn();
      vi.mocked(getDunningGuard).mockReturnValue({
        canPerformAction: mockCanPerformAction,
      } as unknown as ReturnType<typeof getDunningGuard>);

      const mockSchemaGetter = vi.fn().mockReturnValue({});

      const preparedData = await service.enrich(
        {
          rawBookingData: createMockRawBookingData(),
          rawBookingMeta: {},
          eventType: { id: 1, slug: "test-event" },
          loggedInUserId: null,
        },
        mockSchemaGetter
      );

      await service.validate(preparedData, createMockRawBookingData());

      expect(mockCanPerformAction).not.toHaveBeenCalled();
    });

    it("should throw error when event type has both seats and recurring", async () => {
      vi.mocked(getEventType).mockResolvedValue(
        createMockEventType({
          seatsPerTimeSlot: 5,
          recurringEvent: { freq: 2, count: 3, interval: 1 },
        })
      );
      const mockSchemaGetter = vi.fn().mockReturnValue({});

      const preparedData = await service.enrich(
        {
          rawBookingData: createMockRawBookingData(),
          rawBookingMeta: {},
          eventType: { id: 1, slug: "test-event" },
          loggedInUserId: null,
        },
        mockSchemaGetter
      );

      await expect(service.validate(preparedData, createMockRawBookingData())).rejects.toThrow(HttpError);
    });

    it("should call checkIfBookerEmailIsBlocked with userRepository", async () => {
      const mockSchemaGetter = vi.fn().mockReturnValue({});
      const preparedData = await service.enrich(
        {
          rawBookingData: createMockRawBookingData(),
          rawBookingMeta: {},
          eventType: { id: 1, slug: "test-event" },
          loggedInUserId: 101,
        },
        mockSchemaGetter
      );

      await service.validate(preparedData, createMockRawBookingData());

      expect(checkIfBookerEmailIsBlocked).toHaveBeenCalledWith(
        expect.objectContaining({
          bookerEmail: "booker@example.com",
          loggedInUserId: 101,
          userRepository: mockUserRepository,
        })
      );
    });

    it("should call checkActiveBookingsLimitForBooker with bookingRepository", async () => {
      vi.mocked(getEventType).mockResolvedValue(
        createMockEventType({
          maxActiveBookingsPerBooker: 5,
          maxActiveBookingPerBookerOfferReschedule: true,
        })
      );
      const mockSchemaGetter = vi.fn().mockReturnValue({});

      const preparedData = await service.enrich(
        {
          rawBookingData: createMockRawBookingData(),
          rawBookingMeta: {},
          eventType: { id: 1, slug: "test-event" },
          loggedInUserId: null,
        },
        mockSchemaGetter
      );

      await service.validate(preparedData, createMockRawBookingData());

      expect(checkActiveBookingsLimitForBooker).toHaveBeenCalledWith(
        expect.objectContaining({
          eventTypeId: 1,
          maxActiveBookingsPerBooker: 5,
          bookerEmail: "booker@example.com",
          offerToRescheduleLastBooking: true,
          bookingRepository: mockBookingRepository,
        })
      );
    });

    it("should skip booking limits check for reschedule", async () => {
      vi.mocked(getEventType).mockResolvedValue(createMockEventType({ maxActiveBookingsPerBooker: 5 }));
      vi.mocked(getBookingData).mockResolvedValue(createMockBookingData({ rescheduleUid: "existing-uid" }));
      const mockSchemaGetter = vi.fn().mockReturnValue({});

      const preparedData = await service.enrich(
        {
          rawBookingData: createMockRawBookingData({ rescheduleUid: "existing-uid" }),
          rawBookingMeta: {},
          eventType: { id: 1, slug: "test-event" },
          loggedInUserId: null,
        },
        mockSchemaGetter
      );

      await service.validate(preparedData, createMockRawBookingData({ rescheduleUid: "existing-uid" }));

      expect(checkActiveBookingsLimitForBooker).not.toHaveBeenCalled();
    });

    it("should require verification code when requiresBookerEmailVerification is true", async () => {
      vi.mocked(getEventType).mockResolvedValue(
        createMockEventType({ requiresBookerEmailVerification: true })
      );
      const mockSchemaGetter = vi.fn().mockReturnValue({});

      const preparedData = await service.enrich(
        {
          rawBookingData: createMockRawBookingData(),
          rawBookingMeta: {},
          eventType: { id: 1, slug: "test-event" },
          loggedInUserId: null,
        },
        mockSchemaGetter
      );

      await expect(service.validate(preparedData, createMockRawBookingData())).rejects.toThrow(HttpError);
    });

    it("should validate verification code when provided", async () => {
      vi.mocked(getEventType).mockResolvedValue(
        createMockEventType({ requiresBookerEmailVerification: true })
      );
      vi.mocked(verifyCodeUnAuthenticated).mockResolvedValue(true);
      const mockSchemaGetter = vi.fn().mockReturnValue({});

      const preparedData = await service.enrich(
        {
          rawBookingData: createMockRawBookingData({ verificationCode: "123456" }),
          rawBookingMeta: {},
          eventType: { id: 1, slug: "test-event" },
          loggedInUserId: null,
        },
        mockSchemaGetter
      );

      await expect(
        service.validate(preparedData, createMockRawBookingData({ verificationCode: "123456" }))
      ).resolves.toBeUndefined();

      expect(verifyCodeUnAuthenticated).toHaveBeenCalledWith("booker@example.com", "123456");
    });

    it("should throw error for invalid verification code", async () => {
      vi.mocked(getEventType).mockResolvedValue(
        createMockEventType({ requiresBookerEmailVerification: true })
      );
      vi.mocked(verifyCodeUnAuthenticated).mockRejectedValue(new Error("Invalid code"));
      const mockSchemaGetter = vi.fn().mockReturnValue({});

      const preparedData = await service.enrich(
        {
          rawBookingData: createMockRawBookingData({ verificationCode: "wrong" }),
          rawBookingMeta: {},
          eventType: { id: 1, slug: "test-event" },
          loggedInUserId: null,
        },
        mockSchemaGetter
      );

      await expect(
        service.validate(preparedData, createMockRawBookingData({ verificationCode: "wrong" }))
      ).rejects.toThrow(HttpError);
    });

    it("should skip email verification for reschedule", async () => {
      vi.mocked(getEventType).mockResolvedValue(
        createMockEventType({ requiresBookerEmailVerification: true })
      );
      vi.mocked(getBookingData).mockResolvedValue(createMockBookingData({ rescheduleUid: "existing-uid" }));
      const mockSchemaGetter = vi.fn().mockReturnValue({});

      const preparedData = await service.enrich(
        {
          rawBookingData: createMockRawBookingData({ rescheduleUid: "existing-uid" }),
          rawBookingMeta: {},
          eventType: { id: 1, slug: "test-event" },
          loggedInUserId: null,
        },
        mockSchemaGetter
      );

      await expect(
        service.validate(preparedData, createMockRawBookingData({ rescheduleUid: "existing-uid" }))
      ).resolves.toBeUndefined();

      expect(verifyCodeUnAuthenticated).not.toHaveBeenCalled();
    });

    it("should call validateBookingTimeIsNotOutOfBounds", async () => {
      const mockSchemaGetter = vi.fn().mockReturnValue({});
      const preparedData = await service.enrich(
        {
          rawBookingData: createMockRawBookingData(),
          rawBookingMeta: {},
          eventType: { id: 1, slug: "test-event" },
          loggedInUserId: null,
        },
        mockSchemaGetter
      );

      await service.validate(preparedData, createMockRawBookingData());

      expect(validateBookingTimeIsNotOutOfBounds).toHaveBeenCalledWith(
        "2024-01-15T10:00:00.000Z",
        "America/New_York",
        expect.any(Object),
        expect.any(String),
        mockLogger
      );
    });

    it("should call validateEventLength", async () => {
      const mockSchemaGetter = vi.fn().mockReturnValue({});
      const preparedData = await service.enrich(
        {
          rawBookingData: createMockRawBookingData(),
          rawBookingMeta: {},
          eventType: { id: 1, slug: "test-event" },
          loggedInUserId: null,
        },
        mockSchemaGetter
      );

      await service.validate(preparedData, createMockRawBookingData());

      expect(validateEventLength).toHaveBeenCalledWith(
        expect.objectContaining({
          reqBodyStart: "2024-01-15T10:00:00.000Z",
          reqBodyEnd: "2024-01-15T10:30:00.000Z",
          eventTypeLength: 30,
          logger: mockLogger,
        })
      );
    });
  });

  describe("prepare", () => {
    it("should enrich, start spam check, and validate", async () => {
      const mockSpamCheckService = {
        startCheck: vi.fn(),
      };
      vi.mocked(getSpamCheckService).mockReturnValue(mockSpamCheckService);
      const mockSchemaGetter = vi.fn().mockReturnValue({});

      const result = await service.prepare(
        {
          rawBookingData: createMockRawBookingData(),
          rawBookingMeta: {},
          eventType: { id: 1, slug: "test-event" },
          loggedInUserId: null,
        },
        mockSchemaGetter
      );

      expect(result).toHaveProperty("eventType");
      expect(result).toHaveProperty("bookingFormData");
      expect(mockSpamCheckService.startCheck).toHaveBeenCalledWith({
        email: "booker@example.com",
        organizationId: null,
      });
      expect(checkIfBookerEmailIsBlocked).toHaveBeenCalled();
      expect(validateBookingTimeIsNotOutOfBounds).toHaveBeenCalled();
      expect(validateEventLength).toHaveBeenCalled();
    });

    it("should propagate validation errors", async () => {
      vi.mocked(checkIfBookerEmailIsBlocked).mockRejectedValue(new Error("Email is blocked"));
      const mockSchemaGetter = vi.fn().mockReturnValue({});

      await expect(
        service.prepare(
          {
            rawBookingData: createMockRawBookingData(),
            rawBookingMeta: {},
            eventType: { id: 1, slug: "test-event" },
            loggedInUserId: null,
          },
          mockSchemaGetter
        )
      ).rejects.toThrow("Email is blocked");
    });
  });

  describe("data transformation", () => {
    it("should correctly transform reschedule data", async () => {
      vi.mocked(getBookingData).mockResolvedValue(
        createMockBookingData({
          rescheduleReason: "Schedule conflict",
          rescheduleUid: "original-booking-uid",
          rescheduledBy: "user@example.com",
        })
      );
      const mockSchemaGetter = vi.fn().mockReturnValue({});

      const result = await service.enrich(
        {
          rawBookingData: createMockRawBookingData({ rescheduleUid: "original-booking-uid" }),
          rawBookingMeta: {},
          eventType: { id: 1, slug: "test-event" },
          loggedInUserId: null,
        },
        mockSchemaGetter
      );

      expect(result.bookingFormData.rescheduleData).toEqual({
        reason: "Schedule conflict",
        rawUid: "original-booking-uid",
        rescheduledBy: "user@example.com",
      });
    });

    it("should correctly transform routing data", async () => {
      vi.mocked(getBookingData).mockResolvedValue(
        createMockBookingData({
          routedTeamMemberIds: [101, 102],
          routingFormResponseId: 456,
          teamMemberEmail: "team@example.com",
          crmRecordId: "crm-123",
          crmOwnerRecordType: "contact",
          crmAppSlug: "salesforce",
        })
      );
      const mockSchemaGetter = vi.fn().mockReturnValue({});

      const result = await service.enrich(
        {
          rawBookingData: createMockRawBookingData(),
          rawBookingMeta: {},
          eventType: { id: 1, slug: "test-event" },
          loggedInUserId: null,
        },
        mockSchemaGetter
      );

      expect(result.routingData).toEqual(
        expect.objectContaining({
          routedTeamMemberIds: [101, 102],
          routingFormResponseId: 456,
          rawTeamMemberEmail: "team@example.com",
          crmRecordId: "crm-123",
          crmOwnerRecordType: "contact",
          crmAppSlug: "salesforce",
        })
      );
    });

    it("should correctly transform recurring booking data", async () => {
      vi.mocked(getBookingData).mockResolvedValue(
        createMockBookingData({
          luckyUsers: [101, 102],
          allRecurringDates: [{ start: "2024-01-15T10:00:00.000Z" }, { start: "2024-01-22T10:00:00.000Z" }],
          recurringCount: 2,
          isFirstRecurringSlot: true,
          numSlotsToCheckForAvailability: 4,
          recurringEventId: "recurring-123",
          thirdPartyRecurringEventId: "external-456",
        })
      );
      const mockSchemaGetter = vi.fn().mockReturnValue({});

      const result = await service.enrich(
        {
          rawBookingData: createMockRawBookingData(),
          rawBookingMeta: {},
          eventType: { id: 1, slug: "test-event" },
          loggedInUserId: null,
        },
        mockSchemaGetter
      );

      expect(result.recurringBookingData).toEqual({
        luckyUsers: [101, 102],
        allRecurringDates: [{ start: "2024-01-15T10:00:00.000Z" }, { start: "2024-01-22T10:00:00.000Z" }],
        recurringCount: 2,
        isFirstRecurringSlot: true,
        numSlotsToCheckForAvailability: 4,
        recurringEventId: "recurring-123",
        thirdPartyRecurringEventId: "external-456",
      });
    });

    it("should set isDryRun from booking data", async () => {
      vi.mocked(getBookingData).mockResolvedValue(createMockBookingData({ _isDryRun: true }));
      const mockSchemaGetter = vi.fn().mockReturnValue({});

      const result = await service.enrich(
        {
          rawBookingData: createMockRawBookingData(),
          rawBookingMeta: {},
          eventType: { id: 1, slug: "test-event" },
          loggedInUserId: null,
        },
        mockSchemaGetter
      );

      expect(result.config.isDryRun).toBe(true);
    });

    it("should handle skip flags from booking meta", async () => {
      const mockSchemaGetter = vi.fn().mockReturnValue({});

      const result = await service.enrich(
        {
          rawBookingData: createMockRawBookingData(),
          rawBookingMeta: {
            skipAvailabilityCheck: true,
            skipEventLimitsCheck: true,
            skipBookingTimeOutOfBoundsCheck: true,
            skipCalendarSyncTaskCreation: true,
            areCalendarEventsEnabled: false,
          },
          eventType: { id: 1, slug: "test-event" },
          loggedInUserId: null,
        },
        mockSchemaGetter
      );

      expect(result.bookingMeta.skipAvailabilityCheck).toBe(true);
      expect(result.bookingMeta.skipEventLimitsCheck).toBe(true);
      expect(result.bookingMeta.skipBookingTimeOutOfBoundsCheck).toBe(true);
      expect(result.bookingMeta.skipCalendarSyncTaskCreation).toBe(true);
      expect(result.bookingMeta.areCalendarEventsEnabled).toBe(false);
    });
  });

  describe("skipBookingTimeOutOfBoundsCheck", () => {
    it("should skip validateBookingTimeIsNotOutOfBounds when flag is set", async () => {
      const mockSchemaGetter = vi.fn().mockReturnValue({});
      const preparedData = await service.enrich(
        {
          rawBookingData: createMockRawBookingData(),
          rawBookingMeta: { skipBookingTimeOutOfBoundsCheck: true },
          eventType: { id: 1, slug: "test-event" },
          loggedInUserId: null,
        },
        mockSchemaGetter
      );

      await service.validate(preparedData, createMockRawBookingData());

      expect(validateBookingTimeIsNotOutOfBounds).not.toHaveBeenCalled();
      expect(validateEventLength).toHaveBeenCalled();
    });

    it("should call validateBookingTimeIsNotOutOfBounds when flag is not set", async () => {
      const mockSchemaGetter = vi.fn().mockReturnValue({});
      const preparedData = await service.enrich(
        {
          rawBookingData: createMockRawBookingData(),
          rawBookingMeta: {},
          eventType: { id: 1, slug: "test-event" },
          loggedInUserId: null,
        },
        mockSchemaGetter
      );

      await service.validate(preparedData, createMockRawBookingData());

      expect(validateBookingTimeIsNotOutOfBounds).toHaveBeenCalled();
    });
  });
});
