import { test } from "@calcom/testing/lib/fixtures/fixtures";
import { describe, expect, vi } from "vitest";
import { RegularBookingService } from "./RegularBookingService";
import { getEventType } from "../handleNewBooking/getEventType";
import { HttpError } from "@calcom/lib/http-error";

// Mock the getEventType function
vi.mock("../handleNewBooking/getEventType");

const mockGetEventType = vi.mocked(getEventType);

describe("RegularBookingService - Corporate Email Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should throw error when requireCorporateEmail is true and email is from free provider (gmail.com)", async () => {
    // Mock eventType with requireCorporateEmail: true
    mockGetEventType.mockResolvedValue({
      id: 1,
      name: "Test Event",
      eventName: "Test Event",
      type: "test",
      slug: "test",
      userId: 1,
      users: [],
      bookingFields: [],
      locations: [],
      metadata: {},
      requireCorporateEmail: true,
      // Add other required fields
      schedulingType: null,
      length: 30,
      destinationCalendar: null,
      hideCalendarNotes: false,
      requiresConfirmation: false,
      minimumBookingNotice: 0,
      minimumRescheduleNotice: null,
      maxBookingNotice: null,
      price: null,
      currency: null,
      seatsPerTimeSlot: null,
      recurringEvent: null,
      hostGroups: [],
      hosts: [],
      team: null,
      parent: null,
      owner: null,
      parentId: null,
      isDynamic: false,
      requiresBookerEmailVerification: false,
      maxActiveBookingsPerBooker: null,
      maxActiveBookingPerBookerOfferReschedule: false,
    });

    const bookingService = new RegularBookingService();

    // Mock dependencies
    const mockDeps = {
      checkBookingAndDurationLimitsService: {
        checkBookingAndDurationLimits: vi.fn().mockResolvedValue(undefined),
      },
      prismaClient: {} as any,
      bookingRepository: {
        getValidBookingFromEventTypeForAttendee: vi.fn().mockResolvedValue(null),
      },
      luckyUserService: {
        getLuckyUser: vi.fn().mockResolvedValue({ id: 1, name: "Test User", email: "user@example.com" }),
      },
      userRepository: {
        findManyByEmailsWithEmailVerificationSettings: vi.fn().mockResolvedValue([]),
      },
      hashedLinkService: {
        create: vi.fn().mockResolvedValue("test-hashed-link"),
      },
      bookingEmailAndSmsTasker: {} as any,
      bookingEventHandler: {} as any,
      webhookProducer: {} as any,
    };

    // Mock booking data with free email
    const mockBookingData = {
      eventTypeId: 1,
      start: new Date().toISOString(),
      end: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      timeZone: "UTC",
      language: "en",
      metadata: {},
      responses: {
        email: "user@gmail.com",
        name: "Test User",
      },
    };

    const mockInput = {
      bookingData: mockBookingData,
      userId: null,
      userUuid: null,
      platformClientId: null,
      platformCancelUrl: null,
      platformBookingUrl: null,
      platformRescheduleUrl: null,
      platformBookingLocation: null,
      hostname: "localhost",
      forcedSlug: null,
      areCalendarEventsEnabled: true,
      skipAvailabilityCheck: true,
      skipEventLimitsCheck: true,
      skipCalendarSyncTaskCreation: true,
    };

    // Test that the service throws an error for free email
    await expect(
      bookingService.createBooking(mockInput)
    ).rejects.toThrow(HttpError);

    await expect(
      bookingService.createBooking(mockInput)
    ).rejects.toThrow("corporate_email_required");
  });

  test("should throw error when requireCorporateEmail is true and email is from free provider (qq.com)", async () => {
    // Mock eventType with requireCorporateEmail: true
    mockGetEventType.mockResolvedValue({
      id: 1,
      name: "Test Event",
      eventName: "Test Event",
      type: "test",
      slug: "test",
      userId: 1,
      users: [],
      bookingFields: [],
      locations: [],
      metadata: {},
      requireCorporateEmail: true,
      // Add other required fields
      schedulingType: null,
      length: 30,
      destinationCalendar: null,
      hideCalendarNotes: false,
      requiresConfirmation: false,
      minimumBookingNotice: 0,
      minimumRescheduleNotice: null,
      maxBookingNotice: null,
      price: null,
      currency: null,
      seatsPerTimeSlot: null,
      recurringEvent: null,
      hostGroups: [],
      hosts: [],
      team: null,
      parent: null,
      owner: null,
      parentId: null,
      isDynamic: false,
      requiresBookerEmailVerification: false,
      maxActiveBookingsPerBooker: null,
      maxActiveBookingPerBookerOfferReschedule: false,
    });

    const bookingService = new RegularBookingService();

    // Mock dependencies
    const mockDeps = {
      checkBookingAndDurationLimitsService: {
        checkBookingAndDurationLimits: vi.fn().mockResolvedValue(undefined),
      },
      prismaClient: {} as any,
      bookingRepository: {
        getValidBookingFromEventTypeForAttendee: vi.fn().mockResolvedValue(null),
      },
      luckyUserService: {
        getLuckyUser: vi.fn().mockResolvedValue({ id: 1, name: "Test User", email: "user@example.com" }),
      },
      userRepository: {
        findManyByEmailsWithEmailVerificationSettings: vi.fn().mockResolvedValue([]),
      },
      hashedLinkService: {
        create: vi.fn().mockResolvedValue("test-hashed-link"),
      },
      bookingEmailAndSmsTasker: {} as any,
      bookingEventHandler: {} as any,
      webhookProducer: {} as any,
    };

    // Mock booking data with free email
    const mockBookingData = {
      eventTypeId: 1,
      start: new Date().toISOString(),
      end: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      timeZone: "UTC",
      language: "en",
      metadata: {},
      responses: {
        email: "user@qq.com",
        name: "Test User",
      },
    };

    const mockInput = {
      bookingData: mockBookingData,
      userId: null,
      userUuid: null,
      platformClientId: null,
      platformCancelUrl: null,
      platformBookingUrl: null,
      platformRescheduleUrl: null,
      platformBookingLocation: null,
      hostname: "localhost",
      forcedSlug: null,
      areCalendarEventsEnabled: true,
      skipAvailabilityCheck: true,
      skipEventLimitsCheck: true,
      skipCalendarSyncTaskCreation: true,
    };

    // Test that the service throws an error for free email
    await expect(
      bookingService.createBooking(mockInput)
    ).rejects.toThrow(HttpError);

    await expect(
      bookingService.createBooking(mockInput)
    ).rejects.toThrow("corporate_email_required");
  });

  test("should throw error when requireCorporateEmail is true and email is from free provider (163.com)", async () => {
    // Mock eventType with requireCorporateEmail: true
    mockGetEventType.mockResolvedValue({
      id: 1,
      name: "Test Event",
      eventName: "Test Event",
      type: "test",
      slug: "test",
      userId: 1,
      users: [],
      bookingFields: [],
      locations: [],
      metadata: {},
      requireCorporateEmail: true,
      // Add other required fields
      schedulingType: null,
      length: 30,
      destinationCalendar: null,
      hideCalendarNotes: false,
      requiresConfirmation: false,
      minimumBookingNotice: 0,
      minimumRescheduleNotice: null,
      maxBookingNotice: null,
      price: null,
      currency: null,
      seatsPerTimeSlot: null,
      recurringEvent: null,
      hostGroups: [],
      hosts: [],
      team: null,
      parent: null,
      owner: null,
      parentId: null,
      isDynamic: false,
      requiresBookerEmailVerification: false,
      maxActiveBookingsPerBooker: null,
      maxActiveBookingPerBookerOfferReschedule: false,
    });

    const bookingService = new RegularBookingService();

    // Mock dependencies
    const mockDeps = {
      checkBookingAndDurationLimitsService: {
        checkBookingAndDurationLimits: vi.fn().mockResolvedValue(undefined),
      },
      prismaClient: {} as any,
      bookingRepository: {
        getValidBookingFromEventTypeForAttendee: vi.fn().mockResolvedValue(null),
      },
      luckyUserService: {
        getLuckyUser: vi.fn().mockResolvedValue({ id: 1, name: "Test User", email: "user@example.com" }),
      },
      userRepository: {
        findManyByEmailsWithEmailVerificationSettings: vi.fn().mockResolvedValue([]),
      },
      hashedLinkService: {
        create: vi.fn().mockResolvedValue("test-hashed-link"),
      },
      bookingEmailAndSmsTasker: {} as any,
      bookingEventHandler: {} as any,
      webhookProducer: {} as any,
    };

    // Mock booking data with free email
    const mockBookingData = {
      eventTypeId: 1,
      start: new Date().toISOString(),
      end: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      timeZone: "UTC",
      language: "en",
      metadata: {},
      responses: {
        email: "user@163.com",
        name: "Test User",
      },
    };

    const mockInput = {
      bookingData: mockBookingData,
      userId: null,
      userUuid: null,
      platformClientId: null,
      platformCancelUrl: null,
      platformBookingUrl: null,
      platformRescheduleUrl: null,
      platformBookingLocation: null,
      hostname: "localhost",
      forcedSlug: null,
      areCalendarEventsEnabled: true,
      skipAvailabilityCheck: true,
      skipEventLimitsCheck: true,
      skipCalendarSyncTaskCreation: true,
    };

    // Test that the service throws an error for free email
    await expect(
      bookingService.createBooking(mockInput)
    ).rejects.toThrow(HttpError);

    await expect(
      bookingService.createBooking(mockInput)
    ).rejects.toThrow("corporate_email_required");
  });

  test("should throw error when requireCorporateEmail is true and email is from free provider (outlook.com)", async () => {
    // Mock eventType with requireCorporateEmail: true
    mockGetEventType.mockResolvedValue({
      id: 1,
      name: "Test Event",
      eventName: "Test Event",
      type: "test",
      slug: "test",
      userId: 1,
      users: [],
      bookingFields: [],
      locations: [],
      metadata: {},
      requireCorporateEmail: true,
      // Add other required fields
      schedulingType: null,
      length: 30,
      destinationCalendar: null,
      hideCalendarNotes: false,
      requiresConfirmation: false,
      minimumBookingNotice: 0,
      minimumRescheduleNotice: null,
      maxBookingNotice: null,
      price: null,
      currency: null,
      seatsPerTimeSlot: null,
      recurringEvent: null,
      hostGroups: [],
      hosts: [],
      team: null,
      parent: null,
      owner: null,
      parentId: null,
      isDynamic: false,
      requiresBookerEmailVerification: false,
      maxActiveBookingsPerBooker: null,
      maxActiveBookingPerBookerOfferReschedule: false,
    });

    const bookingService = new RegularBookingService();

    // Mock dependencies
    const mockDeps = {
      checkBookingAndDurationLimitsService: {
        checkBookingAndDurationLimits: vi.fn().mockResolvedValue(undefined),
      },
      prismaClient: {} as any,
      bookingRepository: {
        getValidBookingFromEventTypeForAttendee: vi.fn().mockResolvedValue(null),
      },
      luckyUserService: {
        getLuckyUser: vi.fn().mockResolvedValue({ id: 1, name: "Test User", email: "user@example.com" }),
      },
      userRepository: {
        findManyByEmailsWithEmailVerificationSettings: vi.fn().mockResolvedValue([]),
      },
      hashedLinkService: {
        create: vi.fn().mockResolvedValue("test-hashed-link"),
      },
      bookingEmailAndSmsTasker: {} as any,
      bookingEventHandler: {} as any,
      webhookProducer: {} as any,
    };

    // Mock booking data with free email
    const mockBookingData = {
      eventTypeId: 1,
      start: new Date().toISOString(),
      end: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      timeZone: "UTC",
      language: "en",
      metadata: {},
      responses: {
        email: "user@outlook.com",
        name: "Test User",
      },
    };

    const mockInput = {
      bookingData: mockBookingData,
      userId: null,
      userUuid: null,
      platformClientId: null,
      platformCancelUrl: null,
      platformBookingUrl: null,
      platformRescheduleUrl: null,
      platformBookingLocation: null,
      hostname: "localhost",
      forcedSlug: null,
      areCalendarEventsEnabled: true,
      skipAvailabilityCheck: true,
      skipEventLimitsCheck: true,
      skipCalendarSyncTaskCreation: true,
    };

    // Test that the service throws an error for free email
    await expect(
      bookingService.createBooking(mockInput)
    ).rejects.toThrow(HttpError);

    await expect(
      bookingService.createBooking(mockInput)
    ).rejects.toThrow("corporate_email_required");
  });

  test("should not throw error when requireCorporateEmail is true and email is a corporate email", async () => {
    // Mock eventType with requireCorporateEmail: true
    mockGetEventType.mockResolvedValue({
      id: 1,
      name: "Test Event",
      eventName: "Test Event",
      type: "test",
      slug: "test",
      userId: 1,
      users: [],
      bookingFields: [],
      locations: [],
      metadata: {},
      requireCorporateEmail: true,
      // Add other required fields
      schedulingType: null,
      length: 30,
      destinationCalendar: null,
      hideCalendarNotes: false,
      requiresConfirmation: false,
      minimumBookingNotice: 0,
      minimumRescheduleNotice: null,
      maxBookingNotice: null,
      price: null,
      currency: null,
      seatsPerTimeSlot: null,
      recurringEvent: null,
      hostGroups: [],
      hosts: [],
      team: null,
      parent: null,
      owner: null,
      parentId: null,
      isDynamic: false,
      requiresBookerEmailVerification: false,
      maxActiveBookingsPerBooker: null,
      maxActiveBookingPerBookerOfferReschedule: false,
    });

    const bookingService = new RegularBookingService();

    // Mock dependencies
    const mockDeps = {
      checkBookingAndDurationLimitsService: {
        checkBookingAndDurationLimits: vi.fn().mockResolvedValue(undefined),
      },
      prismaClient: {} as any,
      bookingRepository: {
        getValidBookingFromEventTypeForAttendee: vi.fn().mockResolvedValue(null),
      },
      luckyUserService: {
        getLuckyUser: vi.fn().mockResolvedValue({ id: 1, name: "Test User", email: "user@example.com" }),
      },
      userRepository: {
        findManyByEmailsWithEmailVerificationSettings: vi.fn().mockResolvedValue([]),
      },
      hashedLinkService: {
        create: vi.fn().mockResolvedValue("test-hashed-link"),
      },
      bookingEmailAndSmsTasker: {} as any,
      bookingEventHandler: {} as any,
      webhookProducer: {} as any,
    };

    // Mock booking data with corporate email
    const mockBookingData = {
      eventTypeId: 1,
      start: new Date().toISOString(),
      end: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      timeZone: "UTC",
      language: "en",
      metadata: {},
      responses: {
        email: "user@company.com",
        name: "Test User",
      },
    };

    const mockInput = {
      bookingData: mockBookingData,
      userId: null,
      userUuid: null,
      platformClientId: null,
      platformCancelUrl: null,
      platformBookingUrl: null,
      platformRescheduleUrl: null,
      platformBookingLocation: null,
      hostname: "localhost",
      forcedSlug: null,
      areCalendarEventsEnabled: true,
      skipAvailabilityCheck: true,
      skipEventLimitsCheck: true,
      skipCalendarSyncTaskCreation: true,
    };

    // Test that the service does not throw an error for corporate email
    // Note: We're not testing the full booking process, just the email validation
    // The test will still fail at a later stage due to missing dependencies, but it should not fail at the email validation stage
    try {
      await bookingService.createBooking(mockInput);
    } catch (error) {
      // The error should not be about corporate email
      if (error instanceof HttpError) {
        expect(error.message).not.toBe("corporate_email_required");
      }
    }
  });

  test("should not throw error when requireCorporateEmail is false and email is from free provider", async () => {
    // Mock eventType with requireCorporateEmail: false
    mockGetEventType.mockResolvedValue({
      id: 1,
      name: "Test Event",
      eventName: "Test Event",
      type: "test",
      slug: "test",
      userId: 1,
      users: [],
      bookingFields: [],
      locations: [],
      metadata: {},
      requireCorporateEmail: false,
      // Add other required fields
      schedulingType: null,
      length: 30,
      destinationCalendar: null,
      hideCalendarNotes: false,
      requiresConfirmation: false,
      minimumBookingNotice: 0,
      minimumRescheduleNotice: null,
      maxBookingNotice: null,
      price: null,
      currency: null,
      seatsPerTimeSlot: null,
      recurringEvent: null,
      hostGroups: [],
      hosts: [],
      team: null,
      parent: null,
      owner: null,
      parentId: null,
      isDynamic: false,
      metadata: {},
      requiresBookerEmailVerification: false,
      maxActiveBookingsPerBooker: null,
      maxActiveBookingPerBookerOfferReschedule: false,
    });

    const bookingService = new RegularBookingService();

    // Mock dependencies
    const mockDeps = {
      checkBookingAndDurationLimitsService: {
        checkBookingAndDurationLimits: vi.fn().mockResolvedValue(undefined),
      },
      prismaClient: {} as any,
      bookingRepository: {
        getValidBookingFromEventTypeForAttendee: vi.fn().mockResolvedValue(null),
      },
      luckyUserService: {
        getLuckyUser: vi.fn().mockResolvedValue({ id: 1, name: "Test User", email: "user@example.com" }),
      },
      userRepository: {
        findManyByEmailsWithEmailVerificationSettings: vi.fn().mockResolvedValue([]),
      },
      hashedLinkService: {
        create: vi.fn().mockResolvedValue("test-hashed-link"),
      },
      bookingEmailAndSmsTasker: {} as any,
      bookingEventHandler: {} as any,
      webhookProducer: {} as any,
    };

    // Mock booking data with free email
    const mockBookingData = {
      eventTypeId: 1,
      start: new Date().toISOString(),
      end: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      timeZone: "UTC",
      language: "en",
      metadata: {},
      responses: {
        email: "user@gmail.com",
        name: "Test User",
      },
    };

    const mockInput = {
      bookingData: mockBookingData,
      userId: null,
      userUuid: null,
      platformClientId: null,
      platformCancelUrl: null,
      platformBookingUrl: null,
      platformRescheduleUrl: null,
      platformBookingLocation: null,
      hostname: "localhost",
      forcedSlug: null,
      areCalendarEventsEnabled: true,
      skipAvailabilityCheck: true,
      skipEventLimitsCheck: true,
      skipCalendarSyncTaskCreation: true,
    };

    // Test that the service does not throw an error for free email when requireCorporateEmail is false
    // Note: We're not testing the full booking process, just the email validation
    // The test will still fail at a later stage due to missing dependencies, but it should not fail at the email validation stage
    try {
      await bookingService.createBooking(mockInput);
    } catch (error) {
      // The error should not be about corporate email
      if (error instanceof HttpError) {
        expect(error.message).not.toBe("corporate_email_required");
      }
    }
  });

  test("should not throw error when requireCorporateEmail is not provided and email is from free provider", async () => {
    // Mock eventType without requireCorporateEmail field (should default to false)
    mockGetEventType.mockResolvedValue({
      id: 1,
      name: "Test Event",
      eventName: "Test Event",
      type: "test",
      slug: "test",
      userId: 1,
      users: [],
      bookingFields: [],
      locations: [],
      metadata: {},
      // requireCorporateEmail field is missing
      // Add other required fields
      schedulingType: null,
      length: 30,
      destinationCalendar: null,
      hideCalendarNotes: false,
      requiresConfirmation: false,
      minimumBookingNotice: 0,
      minimumRescheduleNotice: null,
      maxBookingNotice: null,
      price: null,
      currency: null,
      seatsPerTimeSlot: null,
      recurringEvent: null,
      hostGroups: [],
      hosts: [],
      team: null,
      parent: null,
      owner: null,
      parentId: null,
      isDynamic: false,
      requiresBookerEmailVerification: false,
      maxActiveBookingsPerBooker: null,
      maxActiveBookingPerBookerOfferReschedule: false,
    });

    const bookingService = new RegularBookingService();

    // Mock dependencies
    const mockDeps = {
      checkBookingAndDurationLimitsService: {
        checkBookingAndDurationLimits: vi.fn().mockResolvedValue(undefined),
      },
      prismaClient: {} as any,
      bookingRepository: {
        getValidBookingFromEventTypeForAttendee: vi.fn().mockResolvedValue(null),
      },
      luckyUserService: {
        getLuckyUser: vi.fn().mockResolvedValue({ id: 1, name: "Test User", email: "user@example.com" }),
      },
      userRepository: {
        findManyByEmailsWithEmailVerificationSettings: vi.fn().mockResolvedValue([]),
      },
      hashedLinkService: {
        create: vi.fn().mockResolvedValue("test-hashed-link"),
      },
      bookingEmailAndSmsTasker: {} as any,
      bookingEventHandler: {} as any,
      webhookProducer: {} as any,
    };

    // Mock booking data with free email
    const mockBookingData = {
      eventTypeId: 1,
      start: new Date().toISOString(),
      end: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      timeZone: "UTC",
      language: "en",
      metadata: {},
      responses: {
        email: "user@gmail.com",
        name: "Test User",
      },
    };

    const mockInput = {
      bookingData: mockBookingData,
      userId: null,
      userUuid: null,
      platformClientId: null,
      platformCancelUrl: null,
      platformBookingUrl: null,
      platformRescheduleUrl: null,
      platformBookingLocation: null,
      hostname: "localhost",
      forcedSlug: null,
      areCalendarEventsEnabled: true,
      skipAvailabilityCheck: true,
      skipEventLimitsCheck: true,
      skipCalendarSyncTaskCreation: true,
    };

    // Test that the service does not throw an error for free email when requireCorporateEmail is not provided
    // Note: We're not testing the full booking process, just the email validation
    // The test will still fail at a later stage due to missing dependencies, but it should not fail at the email validation stage
    try {
      await bookingService.createBooking(mockInput);
    } catch (error) {
      // The error should not be about corporate email
      if (error instanceof HttpError) {
        expect(error.message).not.toBe("corporate_email_required");
      }
    }
  });

  test("should be case insensitive when checking email domain", async () => {
    // Mock eventType with requireCorporateEmail: true
    mockGetEventType.mockResolvedValue({
      id: 1,
      name: "Test Event",
      eventName: "Test Event",
      type: "test",
      slug: "test",
      userId: 1,
      users: [],
      bookingFields: [],
      locations: [],
      metadata: {},
      requireCorporateEmail: true,
      // Add other required fields
      schedulingType: null,
      length: 30,
      destinationCalendar: null,
      hideCalendarNotes: false,
      requiresConfirmation: false,
      minimumBookingNotice: 0,
      minimumRescheduleNotice: null,
      maxBookingNotice: null,
      price: null,
      currency: null,
      seatsPerTimeSlot: null,
      recurringEvent: null,
      hostGroups: [],
      hosts: [],
      team: null,
      parent: null,
      owner: null,
      parentId: null,
      isDynamic: false,
      requiresBookerEmailVerification: false,
      maxActiveBookingsPerBooker: null,
      maxActiveBookingPerBookerOfferReschedule: false,
    });

    const bookingService = new RegularBookingService();

    // Mock dependencies
    const mockDeps = {
      checkBookingAndDurationLimitsService: {
        checkBookingAndDurationLimits: vi.fn().mockResolvedValue(undefined),
      },
      prismaClient: {} as any,
      bookingRepository: {
        getValidBookingFromEventTypeForAttendee: vi.fn().mockResolvedValue(null),
      },
      luckyUserService: {
        getLuckyUser: vi.fn().mockResolvedValue({ id: 1, name: "Test User", email: "user@example.com" }),
      },
      userRepository: {
        findManyByEmailsWithEmailVerificationSettings: vi.fn().mockResolvedValue([]),
      },
      hashedLinkService: {
        create: vi.fn().mockResolvedValue("test-hashed-link"),
      },
      bookingEmailAndSmsTasker: {} as any,
      bookingEventHandler: {} as any,
      webhookProducer: {} as any,
    };

    // Mock booking data with uppercase free email
    const mockBookingData = {
      eventTypeId: 1,
      start: new Date().toISOString(),
      end: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      timeZone: "UTC",
      language: "en",
      metadata: {},
      responses: {
        email: "USER@GMAIL.COM",
        name: "Test User",
      },
    };

    const mockInput = {
      bookingData: mockBookingData,
      userId: null,
      userUuid: null,
      platformClientId: null,
      platformCancelUrl: null,
      platformBookingUrl: null,
      platformRescheduleUrl: null,
      platformBookingLocation: null,
      hostname: "localhost",
      forcedSlug: null,
      areCalendarEventsEnabled: true,
      skipAvailabilityCheck: true,
      skipEventLimitsCheck: true,
      skipCalendarSyncTaskCreation: true,
    };

    // Test that the service throws an error for uppercase free email
    await expect(
      bookingService.createBooking(mockInput)
    ).rejects.toThrow(HttpError);

    await expect(
      bookingService.createBooking(mockInput)
    ).rejects.toThrow("corporate_email_required");
  });
});
