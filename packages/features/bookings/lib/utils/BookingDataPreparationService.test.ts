import mockLogger from "@calcom/lib/__mocks__/logger";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import dayjs from "@calcom/dayjs";
import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";

import type { CreateBookingMeta, CreateRegularBookingData } from "../dto/types";
import getBookingDataSchema from "../getBookingDataSchema";
import { getEventType } from "../handleNewBooking/getEventType";
import type { getEventTypeResponse } from "../handleNewBooking/getEventTypesFromDB";
import { BookingDataPreparationService } from "./BookingDataPreparationService";

vi.mock("../handleNewBooking/getEventType", () => ({
  getEventType: vi.fn(),
}));

vi.mock("../handleNewBooking/logger", () => ({
  createLoggerWithEventDetails: vi.fn().mockReturnValue(mockLogger.getSubLogger()),
}));

vi.mock("@calcom/features/profile/repositories/ProfileRepository", () => ({
  ProfileRepository: {
    findFirstForUserId: vi.fn().mockResolvedValue({ organizationId: null }),
  },
}));

// Test Data Builders
const createStandardBookingFields = () => [
  {
    type: "name" as const,
    name: "name",
    editable: "system" as const,
    defaultLabel: "your_name",
    required: true,
    sources: [
      {
        label: "Default",
        id: "default",
        type: "default" as const,
      },
    ],
  },
  {
    type: "email" as const,
    name: "email",
    defaultLabel: "email_address",
    required: true,
    editable: "system-but-optional" as const,
    sources: [
      {
        label: "Default",
        id: "default",
        type: "default" as const,
      },
    ],
  },
  {
    type: "phone" as const,
    name: "attendeePhoneNumber",
    defaultLabel: "phone_number",
    required: false,
    hidden: true,
    editable: "system-but-optional" as const,
    sources: [
      {
        label: "Default",
        id: "default",
        type: "default" as const,
      },
    ],
  },
  {
    type: "radioInput" as const,
    name: "location",
    defaultLabel: "location",
    editable: "system" as const,
    hideWhenJustOneOption: true,
    required: false,
    getOptionsAt: "locations" as const,
    optionsInputs: {
      attendeeInPerson: {
        type: "address" as const,
        required: true,
        placeholder: "",
      },
      phone: {
        type: "phone" as const,
        required: true,
        placeholder: "",
      },
    },
    sources: [
      {
        label: "Default",
        id: "default",
        type: "default" as const,
      },
    ],
  },
  {
    type: "textarea" as const,
    name: "notes",
    defaultLabel: "additional_notes",
    required: false,
    editable: "system-but-optional" as const,
    sources: [
      {
        label: "Default",
        id: "default",
        type: "default" as const,
      },
    ],
  },
  {
    type: "multiemail" as const,
    name: "guests",
    defaultLabel: "additional_guests",
    required: false,
    hidden: false,
    editable: "system-but-optional" as const,
    sources: [
      {
        label: "Default",
        id: "default",
        type: "default" as const,
      },
    ],
  },
];

const createMockEventType = (overrides?: Partial<getEventTypeResponse>): getEventTypeResponse => {
  const timestamp = Date.now();
  return {
    id: 1,
    slug: "test-event",
    title: "Test Event",
    length: 30,
    userId: 101,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bookingFields: createStandardBookingFields() as any, // Proper booking fields structure
    users: [
      {
        id: 101,
        email: `organizer-${timestamp}@example.com`,
        name: "Test Organizer",
        username: "organizer",
        timeZone: "UTC",
        defaultScheduleId: 1,
        schedules: [
          {
            id: 1,
            timeZone: "UTC",
            availability: [],
          },
        ],
        credentials: [],
        allSelectedCalendars: [],
        destinationCalendar: null,
        locale: "en",
      },
    ],
    teamId: null,
    team: null,
    metadata: null,
    locations: [],
    customInputs: [],
    schedule: {
      id: 1,
      timeZone: "UTC",
      availability: [],
    },
    timeZone: "UTC",
    hosts: [],
    owner: null,
    workflows: [],
    recurringEvent: null,
    price: 0,
    currency: "USD",
    seatsPerTimeSlot: null,
    seatsShowAttendees: false,
    seatsShowAvailabilityCount: true,
    periodType: "UNLIMITED",
    periodStartDate: null,
    periodEndDate: null,
    periodDays: null,
    periodCountCalendarDays: false,
    requiresConfirmation: false,
    requiresConfirmationForFreeEmail: false,
    requiresBookerEmailVerification: false,
    disableGuests: false,
    minimumBookingNotice: 120,
    maxActiveBookingsPerBooker: null,
    maxActiveBookingPerBookerOfferReschedule: false,
    beforeEventBuffer: 0,
    afterEventBuffer: 0,
    schedulingType: null,
    bookingLimits: null,
    durationLimits: null,
    hideCalendarNotes: false,
    hideCalendarEventDetails: false,
    lockTimeZoneToggleOnBookingPage: false,
    eventName: null,
    successRedirectUrl: null,
    description: "Test event description",
    isDynamic: false,
    assignAllTeamMembers: false,
    isRRWeightsEnabled: false,
    rescheduleWithSameRoundRobinHost: false,
    parentId: null,
    parent: null,
    destinationCalendar: null,
    useEventTypeDestinationCalendarEmail: false,
    secondaryEmailId: null,
    secondaryEmail: null,
    availability: [],
    lockedTimeZone: null,
    useBookerTimezone: false,
    assignRRMembersUsingSegment: false,
    rrSegmentQueryValue: null,
    useEventLevelSelectedCalendars: false,
    hostGroups: [],
    disableRescheduling: false,
    disableCancelling: false,
    restrictionScheduleId: null,
    profile: {
      organizationId: null,
    },
    maxLeadThreshold: null,
    includeNoShowInRRCalculation: false,
    ...overrides,
  };
};

const createMockBookingData = (overrides?: Partial<CreateRegularBookingData>): CreateRegularBookingData => {
  const timestamp = Date.now();
  const startTime = dayjs().add(1, "day").startOf("hour").add(10, "hours");
  const endTime = startTime.add(30, "minutes");

  return {
    eventTypeId: 1,
    eventTypeSlug: "test-event",
    timeZone: "UTC",
    language: "en",
    start: startTime.toISOString(),
    end: endTime.toISOString(),
    user: "organizer",
    responses: {
      name: "Test Booker",
      email: `booker-${timestamp}@example.com`,
    },
    metadata: {},
    ...overrides,
  };
};

const createMockBookingMeta = (overrides?: Partial<CreateBookingMeta>): CreateBookingMeta => ({
  userId: 101,
  hostname: "localhost",
  ...overrides,
});

const createEventTypeWithTimezone = (timeZone: string): getEventTypeResponse =>
  createMockEventType({
    schedule: {
      id: 1,
      timeZone,
      availability: [],
    },
  });

const createEventTypeWithUserScheduleTimezone = (timeZone: string): getEventTypeResponse =>
  createMockEventType({
    schedule: null,
    users: [
      {
        ...createMockEventType().users[0],
        schedules: [
          {
            id: 1,
            timeZone,
            availability: [],
          },
        ],
        defaultScheduleId: 1,
      },
    ],
  });

const createEventTypeWithBookingLimits = (
  maxActiveBookingsPerBooker: number,
  offerToRescheduleLastBooking = false
): getEventTypeResponse =>
  createMockEventType({
    maxActiveBookingsPerBooker,
    maxActiveBookingPerBookerOfferReschedule: offerToRescheduleLastBooking,
  });

const createPlatformBookingMeta = (): CreateBookingMeta =>
  createMockBookingMeta({
    platformClientId: "platform-123",
    platformBookingUrl: "https://platform.example.com/booking",
    platformRescheduleUrl: "https://platform.example.com/reschedule",
    platformCancelUrl: "https://platform.example.com/cancel",
    areCalendarEventsEnabled: true,
  });

const createBookingDataWithTime = (startTime: dayjs.Dayjs, durationMinutes = 30): CreateRegularBookingData =>
  createMockBookingData({
    start: startTime.toISOString(),
    end: startTime.add(durationMinutes, "minutes").toISOString(),
  });

const createBookingDataWithGuests = (guests: string[]): CreateRegularBookingData =>
  createMockBookingData({
    responses: {
      ...createMockBookingData().responses,
      guests,
    },
  });

const createBookingDataWithNotes = (notes: string): CreateRegularBookingData =>
  createMockBookingData({
    responses: {
      ...createMockBookingData().responses,
      notes,
    },
  });

const createBookingDataWithRouting = (
  routedTeamMemberIds: number[],
  teamMemberEmail: string
): CreateRegularBookingData =>
  createMockBookingData({
    routedTeamMemberIds,
    teamMemberEmail,
  });

const createRescheduleBookingData = (rescheduleUid: string): CreateRegularBookingData =>
  createMockBookingData({
    rescheduleUid,
  });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createEventTypeWithCustomBookingFields = (customFields: any[] = []): getEventTypeResponse =>
  createMockEventType({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bookingFields: [...createStandardBookingFields(), ...customFields] as any,
  });

const createEventTypeWithOptionalEmail = (): getEventTypeResponse => {
  const bookingFields = createStandardBookingFields();
  // Make email field optional
  const emailField = bookingFields.find((field) => field.name === "email");
  if (emailField) {
    emailField.required = false;
  }
  return createMockEventType({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bookingFields: bookingFields as any,
  });
};

const createEventTypeWithRequiredNotes = (): getEventTypeResponse => {
  const bookingFields = createStandardBookingFields();
  // Make notes field required
  const notesField = bookingFields.find((field) => field.name === "notes");
  if (notesField) {
    notesField.required = true;
  }
  return createMockEventType({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bookingFields: bookingFields as any,
  });
};

// Date helpers
const daysFromNow = (days: number) => dayjs().add(days, "days");
const hoursAgo = (hours: number) => dayjs().subtract(hours, "hours");

// Assertion helpers
const expectValidationResult = (result: unknown) => {
  expect(result).toHaveProperty("eventType");
  expect(result).toHaveProperty("bookingFormData");
  expect(result).toHaveProperty("loggedInUser");
  expect(result).toHaveProperty("routingData");
  expect(result).toHaveProperty("bookingMeta");
  expect(result).toHaveProperty("config");
  expect(result).toHaveProperty("recurringBookingData");
  expect(result).toHaveProperty("seatsData");
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const expectBookerDetails = (result: any, expectedName: string, expectedEmail: string) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expect((result as any).bookingFormData.booker.name).toBe(expectedName);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expect((result as any).bookingFormData.booker.email).toBe(expectedEmail);
};

const expectRepositoryCallsForValidation = (
  eventTypeId: number,
  eventTypeSlug: string,
  _bookerEmail: string,
  _loggedInUserId?: number
) => {
  expect(mockGetEventType).toHaveBeenCalledWith({
    eventTypeId,
    eventTypeSlug,
  });

  // Email blocking only checks repository if email is blacklisted
  // For regular test emails, this won't be called
};

const expectActiveBookingsLimitCheck = (
  eventTypeId: number,
  bookerEmail: string,
  offerToRescheduleLastBooking = true
) => {
  if (offerToRescheduleLastBooking) {
    // When offering to reschedule, it calls findActiveBookingsForEventType
    expect(mockBookingRepository.findActiveBookingsForEventType).toHaveBeenCalledWith({
      eventTypeId,
      bookerEmail,
      limit: expect.any(Number),
    });
  } else {
    // Otherwise it calls countActiveBookingsForEventType
    expect(mockBookingRepository.countActiveBookingsForEventType).toHaveBeenCalledWith({
      eventTypeId,
      bookerEmail,
    });
  }
};

const expectNoActiveBookingsLimitCheck = () => {
  expect(mockBookingRepository.countActiveBookingsForEventType).not.toHaveBeenCalled();
};

// Mock Repositories
const mockBookingRepository = {
  countActiveBookingsForEventType: vi.fn(),
  findActiveBookingsForEventType: vi.fn(),
} as BookingRepository;

const mockUserRepository = {
  findVerifiedUserByEmail: vi.fn(),
} as UserRepository;

const mockGetEventType = vi.mocked(getEventType);

describe("BookingDataPreparationService", () => {
  let bookingDataPreparationService: BookingDataPreparationService;

  let bookingTestData: {
    standardEventType: getEventTypeResponse;
    bookingData: CreateRegularBookingData;
    bookingMeta: CreateBookingMeta;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    bookingDataPreparationService = new BookingDataPreparationService({
      log: mockLogger,
      bookingRepository: mockBookingRepository,
      userRepository: mockUserRepository,
    });

    bookingTestData = {
      standardEventType: createMockEventType(),
      bookingData: createMockBookingData(),
      bookingMeta: createMockBookingMeta(),
    };

    mockGetEventType.mockResolvedValue(bookingTestData.standardEventType);
    mockUserRepository.findVerifiedUserByEmail.mockResolvedValue(null); // No blocked user found
    mockBookingRepository.countActiveBookingsForEventType.mockResolvedValue(0); // No active bookings
    mockBookingRepository.findActiveBookingsForEventType.mockResolvedValue([]); // No active bookings for reschedule
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("when preparing a standard booking", () => {
    it("should successfully prepare and return complete booking details", async () => {
      const context = {
        rawBookingData: bookingTestData.bookingData,
        rawBookingMeta: bookingTestData.bookingMeta,
        eventType: { id: 1, slug: "test-event" },
        loggedInUserId: null,
      };

      const result = await bookingDataPreparationService.prepare(context, getBookingDataSchema);

      expectValidationResult(result);
      expectBookerDetails(result, "Test Booker", bookingTestData.bookingData.responses.email);
      expectRepositoryCallsForValidation(1, "test-event", bookingTestData.bookingData.responses.email);
      expect(result.eventType.id).toBe(1);
      expect(result.loggedInUser.id).toBeNull();
    });

    it("should prepare booking with logged in user context", async () => {
      const context = {
        rawBookingData: bookingTestData.bookingData,
        rawBookingMeta: bookingTestData.bookingMeta,
        eventType: { id: 1, slug: "test-event" },
        loggedInUserId: 123,
      };

      const result = await bookingDataPreparationService.prepare(context, getBookingDataSchema);

      expect(result.loggedInUser.id).toBe(123);
      expectRepositoryCallsForValidation(1, "test-event", bookingTestData.bookingData.responses.email, 123);
    });

    it("should handle booking with guest attendees", async () => {
      const bookingDataWithGuests = createBookingDataWithGuests(["guest1@example.com", "guest2@example.com"]);
      const context = {
        rawBookingData: bookingDataWithGuests,
        rawBookingMeta: bookingTestData.bookingMeta,
        eventType: { id: 1, slug: "test-event" },
        loggedInUserId: null,
      };

      const result = await bookingDataPreparationService.prepare(context, getBookingDataSchema);

      expect(result.bookingFormData.rawGuests).toEqual(["guest1@example.com", "guest2@example.com"]);
    });

    it("should handle booking with additional notes", async () => {
      const bookingDataWithNotes = createBookingDataWithNotes(
        "This is a test booking with special requirements"
      );
      const context = {
        rawBookingData: bookingDataWithNotes,
        rawBookingMeta: bookingTestData.bookingMeta,
        eventType: { id: 1, slug: "test-event" },
        loggedInUserId: null,
      };

      const result = await bookingDataPreparationService.prepare(context, getBookingDataSchema);

      expect(result.bookingFormData.additionalNotes).toBe("This is a test booking with special requirements");
    });

    it("should handle booking with team routing data", async () => {
      const bookingDataWithRouting = createBookingDataWithRouting([101, 102], "team@example.com");
      const context = {
        rawBookingData: bookingDataWithRouting,
        rawBookingMeta: bookingTestData.bookingMeta,
        eventType: { id: 1, slug: "test-event" },
        loggedInUserId: null,
      };

      const result = await bookingDataPreparationService.prepare(context, getBookingDataSchema);

      expect(result.routingData.routedTeamMemberIds).toEqual([101, 102]);
      expect(result.routingData.rawTeamMemberEmail).toBe("team@example.com");
    });
  });

  describe("when preparing platform bookings", () => {
    it("should properly map platform booking metadata", async () => {
      const platformMeta = createPlatformBookingMeta();
      const context = {
        rawBookingData: bookingTestData.bookingData,
        rawBookingMeta: platformMeta,
        eventType: { id: 1, slug: "test-event" },
        loggedInUserId: null,
      };

      const result = await bookingDataPreparationService.prepare(context, getBookingDataSchema);

      expect(result.bookingMeta.areCalendarEventsEnabled).toBe(true);
      expect(result.bookingMeta.platform).toEqual({
        clientId: "platform-123",
        bookingUrl: "https://platform.example.com/booking",
        rescheduleUrl: "https://platform.example.com/reschedule",
        cancelUrl: "https://platform.example.com/cancel",
        bookingLocation: null,
      });
    });
  });

  describe("when handling timezone configurations", () => {
    it("should use event type schedule timezone when available", async () => {
      const eventTypeWithTimezone = createEventTypeWithTimezone("America/New_York");
      mockGetEventType.mockResolvedValue(eventTypeWithTimezone);

      const context = {
        rawBookingData: bookingTestData.bookingData,
        rawBookingMeta: bookingTestData.bookingMeta,
        eventType: { id: 1, slug: "test-event" },
        loggedInUserId: null,
      };

      const result = await bookingDataPreparationService.prepare(context, getBookingDataSchema);

      expect(result.eventType.timeZone).toBe("America/New_York");
    });

    it("should fall back to user default schedule timezone when event type has no schedule", async () => {
      const eventTypeWithUserTimezone = createEventTypeWithUserScheduleTimezone("Europe/London");
      mockGetEventType.mockResolvedValue(eventTypeWithUserTimezone);

      const context = {
        rawBookingData: bookingTestData.bookingData,
        rawBookingMeta: bookingTestData.bookingMeta,
        eventType: { id: 1, slug: "test-event" },
        loggedInUserId: null,
      };

      const result = await bookingDataPreparationService.prepare(context, getBookingDataSchema);

      expect(result.eventType.timeZone).toBe("Europe/London");
    });
  });

  describe("when checking active booking limits", () => {
    it("should check active booking limits for new bookings when limits are configured", async () => {
      const eventTypeWithLimits = createEventTypeWithBookingLimits(2, true);
      mockGetEventType.mockResolvedValue(eventTypeWithLimits);

      const context = {
        rawBookingData: bookingTestData.bookingData,
        rawBookingMeta: bookingTestData.bookingMeta,
        eventType: { id: 1, slug: "test-event" },
        loggedInUserId: null,
      };

      await bookingDataPreparationService.prepare(context, getBookingDataSchema);

      expectActiveBookingsLimitCheck(1, bookingTestData.bookingData.responses.email);
    });

    it("should skip active booking limit check for rescheduled bookings", async () => {
      const eventTypeWithLimits = createEventTypeWithBookingLimits(2, true);
      mockGetEventType.mockResolvedValue(eventTypeWithLimits);

      const rescheduleBookingData = createRescheduleBookingData("existing-booking-uid");
      const context = {
        rawBookingData: rescheduleBookingData,
        rawBookingMeta: bookingTestData.bookingMeta,
        eventType: { id: 1, slug: "test-event" },
        loggedInUserId: null,
      };

      await bookingDataPreparationService.prepare(context, getBookingDataSchema);

      expectNoActiveBookingsLimitCheck();
    });
  });

  describe("when validating booking time constraints", () => {
    it("should reject bookings scheduled in the past", async () => {
      const pastBookingData = createBookingDataWithTime(hoursAgo(1));
      const context = {
        rawBookingData: pastBookingData,
        rawBookingMeta: bookingTestData.bookingMeta,
        eventType: { id: 1, slug: "test-event" },
        loggedInUserId: null,
      };

      await expect(bookingDataPreparationService.prepare(context, getBookingDataSchema)).rejects.toThrow();
    });

    it("should reject bookings with invalid duration", async () => {
      const invalidDurationBookingData = createBookingDataWithTime(daysFromNow(1), 90); // 90 minutes for 30-minute event
      const context = {
        rawBookingData: invalidDurationBookingData,
        rawBookingMeta: bookingTestData.bookingMeta,
        eventType: { id: 1, slug: "test-event" },
        loggedInUserId: null,
      };

      await expect(bookingDataPreparationService.prepare(context, getBookingDataSchema)).rejects.toThrow(
        "Invalid event length"
      );
    });
  });

  describe("when encountering validation errors", () => {
    it("should throw error when event type is not found", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockGetEventType.mockResolvedValue(null as any);

      const context = {
        rawBookingData: bookingTestData.bookingData,
        rawBookingMeta: bookingTestData.bookingMeta,
        eventType: { id: 1, slug: "test-event" },
        loggedInUserId: null,
      };

      await expect(bookingDataPreparationService.prepare(context, getBookingDataSchema)).rejects.toThrow(
        "Event type not found"
      );
    });

    it("should propagate repository connection errors", async () => {
      const repositoryError = new Error("Database connection failed");
      mockGetEventType.mockRejectedValue(repositoryError);

      const context = {
        rawBookingData: bookingTestData.bookingData,
        rawBookingMeta: bookingTestData.bookingMeta,
        eventType: { id: 1, slug: "test-event" },
        loggedInUserId: null,
      };

      await expect(bookingDataPreparationService.prepare(context, getBookingDataSchema)).rejects.toThrow(
        "Database connection failed"
      );
    });

    it("should handle blocked email validation errors", async () => {
      // Set up environment to simulate blacklisted email
      const originalBlacklistedEmails = process.env.BLACKLISTED_GUEST_EMAILS;
      process.env.BLACKLISTED_GUEST_EMAILS = bookingTestData.bookingData.responses.email;

      // Mock user repository to return null (user not found, should block)
      mockUserRepository.findVerifiedUserByEmail.mockResolvedValue(null);

      const context = {
        rawBookingData: bookingTestData.bookingData,
        rawBookingMeta: bookingTestData.bookingMeta,
        eventType: { id: 1, slug: "test-event" },
        loggedInUserId: null,
      };

      await expect(bookingDataPreparationService.prepare(context, getBookingDataSchema)).rejects.toThrow(
        "Cannot use this email to create the booking."
      );

      // Restore original environment
      if (originalBlacklistedEmails) {
        process.env.BLACKLISTED_GUEST_EMAILS = originalBlacklistedEmails;
      } else {
        delete process.env.BLACKLISTED_GUEST_EMAILS;
      }
    });

    it("should handle booking limit exceeded errors", async () => {
      // Set up event type with booking limits
      const eventTypeWithLimits = createEventTypeWithBookingLimits(1, false); // Max 1 booking
      mockGetEventType.mockResolvedValue(eventTypeWithLimits);

      // Mock repository to return that limit is already reached
      mockBookingRepository.countActiveBookingsForEventType.mockResolvedValue(1);

      const context = {
        rawBookingData: {
          ...bookingTestData.bookingData,
          rescheduleUid: undefined, // Ensure it's a new booking to trigger limit check
        },
        rawBookingMeta: bookingTestData.bookingMeta,
        eventType: { id: 1, slug: "test-event" },
        loggedInUserId: null,
      };

      await expect(bookingDataPreparationService.prepare(context, getBookingDataSchema)).rejects.toThrow();
    });

    it("should reject booking data missing required fields", async () => {
      const incompleteBookingData = createMockBookingData({
        responses: {
          email: "test@example.com",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      const context = {
        rawBookingData: incompleteBookingData,
        rawBookingMeta: bookingTestData.bookingMeta,
        eventType: { id: 1, slug: "test-event" },
        loggedInUserId: null,
      };

      await expect(bookingDataPreparationService.prepare(context, getBookingDataSchema)).rejects.toThrow();
    });

    it("should reject invalid email format with proper booking fields", async () => {
      // Now that we have proper booking fields, email validation should work
      const invalidBookingData = createMockBookingData({
        responses: {
          name: "Test Booker",
          email: "invalid-email-format",
        },
      });

      const context = {
        rawBookingData: invalidBookingData,
        rawBookingMeta: bookingTestData.bookingMeta,
        eventType: { id: 1, slug: "test-event" },
        loggedInUserId: null,
      };

      await expect(bookingDataPreparationService.prepare(context, getBookingDataSchema)).rejects.toThrow();
    });
  });

  describe("when handling different booking field configurations", () => {
    it("should validate booking with optional email field when phone is provided", async () => {
      const eventTypeWithOptionalEmail = createEventTypeWithOptionalEmail();
      mockGetEventType.mockResolvedValue(eventTypeWithOptionalEmail);

      // Cal.com requires at least one contact method (email OR phone)
      // When email is optional and empty, we need to provide a phone number
      const bookingDataWithOptionalEmail = createMockBookingData({
        responses: {
          name: "Test Booker",
          email: "", // Empty email when it's optional
          attendeePhoneNumber: "+1234567890", // But phone number is provided
        },
      });

      const context = {
        rawBookingData: bookingDataWithOptionalEmail,
        rawBookingMeta: bookingTestData.bookingMeta,
        eventType: { id: 1, slug: "test-event" },
        loggedInUserId: null,
      };

      // Should succeed because we have phone as contact method when email is optional
      const result = await bookingDataPreparationService.prepare(context, getBookingDataSchema);
      expectValidationResult(result);

      // Cal.com automatically generates an email from phone number when email is empty
      expect(result.bookingFormData.booker.email).toBe("1234567890@sms.cal.com");
      expect(result.bookingFormData.booker.phoneNumber).toBe("+1234567890");
    });

    it("should validate booking with required notes field", async () => {
      const eventTypeWithRequiredNotes = createEventTypeWithRequiredNotes();
      mockGetEventType.mockResolvedValue(eventTypeWithRequiredNotes);

      const bookingDataWithNotes = createMockBookingData({
        responses: {
          name: "Test Booker",
          email: "test@example.com",
          notes: "This is a required note",
        },
      });

      const context = {
        rawBookingData: bookingDataWithNotes,
        rawBookingMeta: bookingTestData.bookingMeta,
        eventType: { id: 1, slug: "test-event" },
        loggedInUserId: null,
      };

      const result = await bookingDataPreparationService.prepare(context, getBookingDataSchema);
      expectValidationResult(result);
      expect(result.bookingFormData.additionalNotes).toBe("This is a required note");
    });

    it("should reject booking missing required notes field", async () => {
      const eventTypeWithRequiredNotes = createEventTypeWithRequiredNotes();
      mockGetEventType.mockResolvedValue(eventTypeWithRequiredNotes);

      const bookingDataWithoutNotes = createMockBookingData({
        responses: {
          name: "Test Booker",
          email: "test@example.com",
          // Missing required notes
        },
      });

      const context = {
        rawBookingData: bookingDataWithoutNotes,
        rawBookingMeta: bookingTestData.bookingMeta,
        eventType: { id: 1, slug: "test-event" },
        loggedInUserId: null,
      };

      await expect(bookingDataPreparationService.prepare(context, getBookingDataSchema)).rejects.toThrow();
    });

    it("should reject booking when both email and phone are missing", async () => {
      const eventTypeWithOptionalEmail = createEventTypeWithOptionalEmail();
      mockGetEventType.mockResolvedValue(eventTypeWithOptionalEmail);

      // Cal.com business rule: at least one contact method (email OR phone) must be provided
      const bookingDataWithNoContact = createMockBookingData({
        responses: {
          name: "Test Booker",
          email: "", // Empty email
          // No phone number provided either
        },
      });

      const context = {
        rawBookingData: bookingDataWithNoContact,
        rawBookingMeta: bookingTestData.bookingMeta,
        eventType: { id: 1, slug: "test-event" },
        loggedInUserId: null,
      };

      await expect(bookingDataPreparationService.prepare(context, getBookingDataSchema)).rejects.toThrow(
        "Both Phone and Email are missing"
      );
    });

    it("should handle event type with custom booking fields", async () => {
      const customField = {
        type: "text",
        name: "customField",
        label: "Custom Field",
        required: true,
        sources: [{ id: "default", type: "default", label: "Default" }],
      };

      const eventTypeWithCustomFields = createEventTypeWithCustomBookingFields([customField]);
      mockGetEventType.mockResolvedValue(eventTypeWithCustomFields);

      const bookingDataWithCustomField = createMockBookingData({
        responses: {
          name: "Test Booker",
          email: "test@example.com",
          customField: "Custom field value",
        },
      });

      const context = {
        rawBookingData: bookingDataWithCustomField,
        rawBookingMeta: bookingTestData.bookingMeta,
        eventType: { id: 1, slug: "test-event" },
        loggedInUserId: null,
      };

      const result = await bookingDataPreparationService.prepare(context, getBookingDataSchema);
      expectValidationResult(result);
    });
  });

  describe("regression tests for validation bugs", () => {
    it("should check user requiresBookerEmailVerification setting even when email is not blacklisted by env", async () => {
      const timestamp = Date.now();
      const bookerEmail = `test-${timestamp}@example.com`;

      mockUserRepository.findVerifiedUserByEmail.mockResolvedValue({
        id: 999,
        email: bookerEmail,
        requiresBookerEmailVerification: true,
      });

      const bookingData = createMockBookingData({
        responses: {
          name: "Test Booker",
          email: bookerEmail,
        },
      });

      const context = {
        rawBookingData: bookingData,
        rawBookingMeta: bookingTestData.bookingMeta,
        eventType: { id: 1, slug: "test-event" },
        loggedInUserId: null,
      };

      // and no verification code is provided
      await expect(bookingDataPreparationService.prepare(context, getBookingDataSchema)).rejects.toThrow();

      expect(mockUserRepository.findVerifiedUserByEmail).toHaveBeenCalledWith({ email: bookerEmail });
    });

    it("should pass verificationCode to checkIfBookerEmailIsBlocked when provided", async () => {
      const timestamp = Date.now();
      const bookerEmail = `test-${timestamp}@example.com`;
      const verificationCode = "123456";

      mockUserRepository.findVerifiedUserByEmail.mockResolvedValue({
        id: 999,
        email: bookerEmail,
        requiresBookerEmailVerification: true,
      });

      const bookingData = createMockBookingData({
        responses: {
          name: "Test Booker",
          email: bookerEmail,
        },
        verificationCode: verificationCode,
      });

      const context = {
        rawBookingData: bookingData,
        rawBookingMeta: bookingTestData.bookingMeta,
        eventType: { id: 1, slug: "test-event" },
        loggedInUserId: null,
      };

      try {
        await bookingDataPreparationService.prepare(context, getBookingDataSchema);
        // eslint-disable-next-line no-empty
      } catch {}

      expect(mockUserRepository.findVerifiedUserByEmail).toHaveBeenCalled();
    });
  });
});
