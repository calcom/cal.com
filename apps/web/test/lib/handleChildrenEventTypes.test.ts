/* eslint-disable @typescript-eslint/no-unused-vars */
import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";
import updateChildrenEventTypes from "@calcom/features/ee/managed-event-types/lib/handleChildrenEventTypes";
import logger from "@calcom/lib/logger";
import { buildEventType } from "@calcom/lib/test/builder";
import type { EventType, Prisma, User, WorkflowsOnEventTypes } from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/enums";
import { describe, expect, it, vi } from "vitest";

// Mock the logger module
vi.mock("@calcom/lib/logger", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Helper to setup transaction mock that executes the callback with the prisma mock
const setupTransactionMock = () => {
  prismaMock.$transaction.mockImplementation(async (callback) => {
    if (typeof callback === "function") {
      return await callback(prismaMock);
    }
    return Promise.all(callback);
  });
};

// create input does not allow ID
const mockFindFirstEventType = (
  data?: Partial<EventType> & { workflows?: WorkflowsOnEventTypes[] } & { users?: User[] }
) => {
  const eventType = buildEventType({
    ...data,
    metadata: !data?.metadata || data.metadata === null ? {} : (data.metadata as Prisma.JsonValue),
  });
  // const { scheduleId, destinationCalendar, ...restEventType } = eventType;
  prismaMock.eventType.findFirst.mockResolvedValue(eventType);

  return eventType;
};

vi.mock("@calcom/emails/integration-email-service", () => {
  return {
    sendSlugReplacementEmail: () => ({}),
  };
});

vi.mock("@calcom/lib/server/i18n", () => {
  return {
    getTranslation: async (locale: string, namespace: string) => {
      const t = (key: string) => key;
      t.locale = locale;
      t.namespace = namespace;
      return t;
    },
  };
});

describe("handleChildrenEventTypes", () => {
  describe("Shortcircuits", () => {
    it("Returns message 'No managed event type'", async () => {
      mockFindFirstEventType();

      const result = await updateChildrenEventTypes({
        eventTypeId: 1,
        oldEventType: { children: [], team: { name: "" } },
        children: [],
        updatedEventType: { schedulingType: null, slug: "something" },
        currentUserId: 1,
        prisma: prismaMock,
        profileId: null,
        updatedValues: {},
      });
      expect(result.newUserIds).toEqual(undefined);
      expect(result.oldUserIds).toEqual(undefined);
      expect(result.deletedUserIds).toEqual(undefined);
      expect(result.deletedExistentEventTypes).toEqual(undefined);
      expect(result.message).toBe("No managed event type");
    });

    it("Returns message 'No managed event metadata'", async () => {
      mockFindFirstEventType({
        metadata: {},
        locations: [],
      });
      const result = await updateChildrenEventTypes({
        eventTypeId: 1,
        oldEventType: { children: [], team: { name: "" } },
        children: [],
        updatedEventType: { schedulingType: "MANAGED", slug: "something" },
        currentUserId: 1,
        prisma: prismaMock,
        profileId: null,
        updatedValues: {},
      });
      expect(result.newUserIds).toEqual(undefined);
      expect(result.oldUserIds).toEqual(undefined);
      expect(result.deletedUserIds).toEqual(undefined);
      expect(result.deletedExistentEventTypes).toEqual(undefined);
      expect(result.message).toBe("No managed event metadata");
    });

    it("Returns message 'Missing event type'", async () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      prismaMock.eventType.findFirst.mockImplementation(() => {
        return new Promise((resolve) => {
          resolve(null);
        });
      });
      const result = await updateChildrenEventTypes({
        eventTypeId: 1,
        oldEventType: { children: [], team: { name: "" } },
        children: [],
        updatedEventType: { schedulingType: "MANAGED", slug: "something" },
        currentUserId: 1,
        prisma: prismaMock,
        profileId: null,
        updatedValues: {},
      });
      expect(result.newUserIds).toEqual(undefined);
      expect(result.oldUserIds).toEqual(undefined);
      expect(result.deletedUserIds).toEqual(undefined);
      expect(result.deletedExistentEventTypes).toEqual(undefined);
      expect(result.message).toBe("Missing event type");
    });
  });

  describe("Happy paths", () => {
    it("Adds new users", async () => {
      const {
        schedulingType,
        id,
        teamId,
        timeZone,
        requiresBookerEmailVerification,
        lockTimeZoneToggleOnBookingPage,
        useEventTypeDestinationCalendarEmail,
        secondaryEmailId,
        autoTranslateDescriptionEnabled,
        autoTranslateInstantMeetingTitleEnabled,
        includeNoShowInRRCalculation,
        instantMeetingScheduleId,
        enablePerHostLocations,
        redirectUrlOnNoRoutingFormResponse,
        ...evType
      } = mockFindFirstEventType({
        id: 123,
        metadata: { managedEventConfig: {} },
        locations: [],
      });

      // Setup transaction mock to execute the callback
      setupTransactionMock();

      // Mock createManyAndReturn to return the created event type (full EventType shape required for type safety)
      const createdEventType = {
        ...evType,
        id: 123,
        userId: 4,
        schedulingType,
        teamId,
        timeZone,
        requiresBookerEmailVerification,
        lockTimeZoneToggleOnBookingPage,
        useEventTypeDestinationCalendarEmail,
        secondaryEmailId,
        autoTranslateDescriptionEnabled,
        autoTranslateInstantMeetingTitleEnabled,
        includeNoShowInRRCalculation,
        instantMeetingScheduleId,
        enablePerHostLocations,
        redirectUrlOnNoRoutingFormResponse,
      };
      prismaMock.eventType.createManyAndReturn.mockResolvedValue([createdEventType]);

      const result = await updateChildrenEventTypes({
        eventTypeId: 1,
        oldEventType: { children: [], team: { name: "" } },
        children: [{ hidden: false, owner: { id: 4, name: "", email: "", eventTypeSlugs: [] } }],
        updatedEventType: { schedulingType: "MANAGED", slug: "something" },
        currentUserId: 1,
        prisma: prismaMock,
        profileId: null,
        updatedValues: {},
      });
      const { createdAt, updatedAt, ...expectedEvType } = evType;
      expect(prismaMock.eventType.createManyAndReturn).toHaveBeenCalledWith({
        data: [
          {
            ...expectedEvType,
            parentId: 1,
            lockTimeZoneToggleOnBookingPage: false,
            requiresBookerEmailVerification: false,
            bookingLimits: undefined,
            durationLimits: undefined,
            recurringEvent: undefined,
            eventTypeColor: undefined,
            customReplyToEmail: null,
            userId: 4,
            rrSegmentQueryValue: undefined,
            assignRRMembersUsingSegment: false,
            useBookerTimezone: false,
            restrictionScheduleId: null,
            allowReschedulingCancelledBookings: false,
          },
        ],
        skipDuplicates: true,
        select: { id: true, userId: true },
      });
      expect(result.newUserIds).toEqual([4]);
      expect(result.oldUserIds).toEqual([]);
      expect(result.deletedUserIds).toEqual([]);
      expect(result.deletedExistentEventTypes).toEqual(undefined);
    });

    it("Updates old users", async () => {
      const {
        schedulingType,
        id,
        teamId,
        timeZone,
        locations,
        parentId,
        userId,
        scheduleId,
        requiresBookerEmailVerification,
        lockTimeZoneToggleOnBookingPage,
        useEventTypeDestinationCalendarEmail,
        secondaryEmailId,
        assignRRMembersUsingSegment,
        autoTranslateInstantMeetingTitleEnabled,
        includeNoShowInRRCalculation,
        instantMeetingScheduleId,
        enablePerHostLocations,
        redirectUrlOnNoRoutingFormResponse,
        ...evType
      } = mockFindFirstEventType({
        metadata: { managedEventConfig: {} },
        locations: [],
      });

      // Mock findMany for existing records lookup (new batch update optimization)
      // @ts-expect-error - partial mock for test purposes
      prismaMock.eventType.findMany.mockResolvedValue([{ userId: 4, metadata: {} }]);

      // @ts-expect-error - partial mock for test purposes
      prismaMock.eventType.update.mockResolvedValue({ id: 100 });

      const result = await updateChildrenEventTypes({
        eventTypeId: 1,
        oldEventType: { children: [{ userId: 4 }], team: { name: "" } },
        children: [{ hidden: false, owner: { id: 4, name: "", email: "", eventTypeSlugs: [] } }],
        updatedEventType: { schedulingType: "MANAGED", slug: "something" },
        currentUserId: 1,
        prisma: prismaMock,
        profileId: null,
        updatedValues: {
          bookingLimits: undefined,
        },
      });
      const { profileId, autoTranslateDescriptionEnabled, createdAt, updatedAt, ...rest } = evType;
      expect(prismaMock.eventType.update).toHaveBeenCalledWith({
        data: {
          ...rest,
          useEventLevelSelectedCalendars: undefined,
          customReplyToEmail: null,
          rrSegmentQueryValue: undefined,
          locations: [],
          scheduleId: null,
          lockTimeZoneToggleOnBookingPage: false,
          requiresBookerEmailVerification: false,
          useBookerTimezone: false,
          restrictionScheduleId: null,

          hashedLink: {
            deleteMany: {},
          },
          instantMeetingScheduleId: undefined,
          allowReschedulingCancelledBookings: false,
        },
        where: {
          userId_parentId: {
            userId: 4,
            parentId: 1,
          },
        },
      });
      expect(result.newUserIds).toEqual([]);
      expect(result.oldUserIds).toEqual([4]);
      expect(result.deletedUserIds).toEqual([]);
      expect(result.deletedExistentEventTypes).toEqual(undefined);
    });

    it("Deletes old users", async () => {
      mockFindFirstEventType({ users: [], metadata: { managedEventConfig: {} }, locations: [] });
      const result = await updateChildrenEventTypes({
        eventTypeId: 1,
        oldEventType: { children: [{ userId: 4 }], team: { name: "" } },
        children: [],
        updatedEventType: { schedulingType: "MANAGED", slug: "something" },
        currentUserId: 1,
        prisma: prismaMock,
        profileId: null,
        updatedValues: {},
      });
      expect(result.newUserIds).toEqual([]);
      expect(result.oldUserIds).toEqual([]);
      expect(result.deletedUserIds).toEqual([4]);
      expect(result.deletedExistentEventTypes).toEqual(undefined);
    });

    it("Adds new users and updates/delete old users", async () => {
      mockFindFirstEventType({
        metadata: { managedEventConfig: {} },
        locations: [],
      });

      // Mock findMany for existing records lookup (new batch update optimization)
      // @ts-expect-error - partial mock for test purposes
      prismaMock.eventType.findMany.mockResolvedValue([{ userId: 4, metadata: {} }]);

      // @ts-expect-error - partial mock for test purposes
      prismaMock.eventType.update.mockResolvedValue({ id: 101 });

      const result = await updateChildrenEventTypes({
        eventTypeId: 1,
        oldEventType: { children: [{ userId: 4 }, { userId: 1 }], team: { name: "" } },
        children: [
          { hidden: false, owner: { id: 4, name: "", email: "", eventTypeSlugs: [] } },
          { hidden: false, owner: { id: 5, name: "", email: "", eventTypeSlugs: [] } },
        ],
        updatedEventType: { schedulingType: "MANAGED", slug: "something" },
        currentUserId: 1,
        prisma: prismaMock,
        profileId: null,
        updatedValues: {},
      });
      // Have been called
      expect(result.newUserIds).toEqual([5]);
      expect(result.oldUserIds).toEqual([4]);
      expect(result.deletedUserIds).toEqual([1]);
      expect(result.deletedExistentEventTypes).toEqual(undefined);
    });
  });

  describe("Slug conflicts", () => {
    it("Deletes existent event types for new users added", async () => {
      const {
        schedulingType,
        id,
        teamId,
        timeZone,
        requiresBookerEmailVerification,
        lockTimeZoneToggleOnBookingPage,
        useEventTypeDestinationCalendarEmail,
        secondaryEmailId,
        autoTranslateDescriptionEnabled,
        autoTranslateInstantMeetingTitleEnabled,
        includeNoShowInRRCalculation,
        instantMeetingScheduleId,
        assignRRMembersUsingSegment,
        enablePerHostLocations,
        redirectUrlOnNoRoutingFormResponse,
        ...evType
      } = mockFindFirstEventType({
        id: 123,
        metadata: { managedEventConfig: {} },
        locations: [],
      });

      // Setup transaction mock to execute the callback
      setupTransactionMock();

      // Mock createManyAndReturn to return the created event type (full EventType shape required for type safety)
      const createdEventType = {
        ...evType,
        id: 123,
        userId: 4,
        schedulingType,
        teamId,
        timeZone,
        requiresBookerEmailVerification,
        lockTimeZoneToggleOnBookingPage,
        useEventTypeDestinationCalendarEmail,
        secondaryEmailId,
        autoTranslateDescriptionEnabled,
        autoTranslateInstantMeetingTitleEnabled,
        includeNoShowInRRCalculation,
        instantMeetingScheduleId,
        assignRRMembersUsingSegment,
        enablePerHostLocations,
        redirectUrlOnNoRoutingFormResponse,
      };
      prismaMock.eventType.createManyAndReturn.mockResolvedValue([createdEventType]);

      prismaMock.eventType.deleteMany.mockResolvedValue([123] as unknown as Prisma.BatchPayload);
      const result = await updateChildrenEventTypes({
        eventTypeId: 1,
        oldEventType: { children: [], team: { name: "" } },
        children: [{ hidden: false, owner: { id: 4, name: "", email: "", eventTypeSlugs: ["something"] } }],
        updatedEventType: { schedulingType: "MANAGED", slug: "something" },
        currentUserId: 1,
        prisma: prismaMock,
        profileId: null,
        updatedValues: {},
      });
      const { createdAt, updatedAt, ...expectedEvType } = evType;
      expect(prismaMock.eventType.createManyAndReturn).toHaveBeenCalledWith({
        data: [
          {
            ...expectedEvType,
            parentId: 1,
            bookingLimits: undefined,
            durationLimits: undefined,
            recurringEvent: undefined,
            eventTypeColor: undefined,
            customReplyToEmail: null,
            instantMeetingScheduleId: undefined,
            lockTimeZoneToggleOnBookingPage: false,
            requiresBookerEmailVerification: false,
            userId: 4,
            rrSegmentQueryValue: undefined,
            assignRRMembersUsingSegment: false,
            useBookerTimezone: false,
            restrictionScheduleId: null,
            allowReschedulingCancelledBookings: false,
          },
        ],
        skipDuplicates: true,
        select: { id: true, userId: true },
      });
      expect(result.newUserIds).toEqual([4]);
      expect(result.oldUserIds).toEqual([]);
      expect(result.deletedUserIds).toEqual([]);
      expect(result.deletedExistentEventTypes).toEqual([123]);
    });
    it("Deletes existent event types for old users updated", async () => {
      const {
        schedulingType,
        id,
        teamId,
        timeZone,
        locations,
        parentId,
        userId,
        requiresBookerEmailVerification,
        lockTimeZoneToggleOnBookingPage,
        useEventTypeDestinationCalendarEmail,
        secondaryEmailId,
        autoTranslateInstantMeetingTitleEnabled,
        includeNoShowInRRCalculation,
        instantMeetingScheduleId,
        assignRRMembersUsingSegment,
        rrSegmentQueryValue,
        useEventLevelSelectedCalendars,
        enablePerHostLocations,
        redirectUrlOnNoRoutingFormResponse,
        ...evType
      } = mockFindFirstEventType({
        metadata: { managedEventConfig: {} },
        locations: [],
      });

      // Mock findMany for existing records lookup (new batch update optimization)
      // @ts-expect-error - partial mock for test purposes
      prismaMock.eventType.findMany.mockResolvedValue([{ userId: 4, metadata: {} }]);

      // @ts-expect-error - partial mock for test purposes
      prismaMock.eventType.update.mockResolvedValue({ id: 102 });

      prismaMock.eventType.deleteMany.mockResolvedValue([123] as unknown as Prisma.BatchPayload);
      const result = await updateChildrenEventTypes({
        eventTypeId: 1,
        oldEventType: { children: [{ userId: 4 }], team: { name: "" } },
        children: [{ hidden: false, owner: { id: 4, name: "", email: "", eventTypeSlugs: ["something"] } }],
        updatedEventType: { schedulingType: "MANAGED", slug: "something" },
        currentUserId: 1,
        prisma: prismaMock,
        profileId: null,
        updatedValues: {
          length: 30,
        },
      });
      const { profileId, autoTranslateDescriptionEnabled, createdAt, updatedAt, ...rest } = evType;
      expect(prismaMock.eventType.update).toHaveBeenCalledWith({
        data: {
          ...rest,
          customReplyToEmail: null,
          locations: [],
          hashedLink: {
            deleteMany: {},
          },
          useBookerTimezone: false,
          lockTimeZoneToggleOnBookingPage: false,
          requiresBookerEmailVerification: false,
          allowReschedulingCancelledBookings: false,
        },
        where: {
          userId_parentId: {
            userId: 4,
            parentId: 1,
          },
        },
      });
      expect(result.newUserIds).toEqual([]);
      expect(result.oldUserIds).toEqual([4]);
      expect(result.deletedUserIds).toEqual([]);
      expect(result.deletedExistentEventTypes).toEqual([123]);
    });
  });

  describe("Workflows", () => {
    it("Links workflows to new and existing assigned members", async () => {
      const {
        schedulingType: _schedulingType,
        id: _id,
        teamId: _teamId,
        locations: _locations,
        timeZone: _timeZone,
        parentId: _parentId,
        userId: _userId,

        requiresBookerEmailVerification,
        lockTimeZoneToggleOnBookingPage,
        useEventTypeDestinationCalendarEmail,
        secondaryEmailId,
        autoTranslateDescriptionEnabled,
        autoTranslateInstantMeetingTitleEnabled,
        includeNoShowInRRCalculation,
        instantMeetingScheduleId,
        assignRRMembersUsingSegment,
        enablePerHostLocations,
        redirectUrlOnNoRoutingFormResponse,
        ...evType
      } = mockFindFirstEventType({
        metadata: { managedEventConfig: {} },
        locations: [],
        workflows: [
          {
            workflowId: 11,
          } as WorkflowsOnEventTypes,
        ],
      });

      // Setup transaction mock to execute the callback
      setupTransactionMock();

      // Mock createManyAndReturn to return the newly created event type for workflow linking
      // This simulates the event type created for user 5 (full EventType shape required for type safety)
      const createdEventType = {
        ...evType,
        id: 3,
        userId: 5,
        schedulingType: _schedulingType,
        teamId: _teamId,
        locations: _locations,
        timeZone: _timeZone,
        parentId: _parentId,
        requiresBookerEmailVerification,
        lockTimeZoneToggleOnBookingPage,
        useEventTypeDestinationCalendarEmail,
        secondaryEmailId,
        autoTranslateDescriptionEnabled,
        autoTranslateInstantMeetingTitleEnabled,
        includeNoShowInRRCalculation,
        instantMeetingScheduleId,
        assignRRMembersUsingSegment,
        enablePerHostLocations,
        redirectUrlOnNoRoutingFormResponse,
      };
      prismaMock.eventType.createManyAndReturn.mockResolvedValue([createdEventType]);

      // Mock findMany for existing records lookup (new batch update optimization)
      prismaMock.eventType.findMany.mockResolvedValue([{ userId: 4, metadata: {} } as EventType]);

      // Mock the event type that will be returned for existing users
      const mockUpdatedEventType = {
        id: 2,
        userId: 4,
        timeZone: "UTC",
        teamId: 1,
        autoTranslateDescriptionEnabled: false,
        autoTranslateInstantMeetingTitleEnabled: true,
        secondaryEmailId: null,
        schedulingType: SchedulingType.MANAGED,
        requiresBookerEmailVerification: false,
        lockTimeZoneToggleOnBookingPage: false,
        useEventTypeDestinationCalendarEmail: false,
        workflows: [],
        parentId: 1,
        locations: [],
        instantMeetingScheduleId: null,
        assignRRMembersUsingSegment: false,
        includeNoShowInRRCalculation: false,
        enablePerHostLocations,
        redirectUrlOnNoRoutingFormResponse,
        ...evType,
      };

      prismaMock.eventType.update.mockResolvedValue({
        ...mockUpdatedEventType,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock workflowsOnEventTypes.findMany to return empty array (no existing workflow links for old event types)
      // This is needed because the new implementation uses findMany + createMany instead of upsert
      prismaMock.workflowsOnEventTypes.findMany.mockResolvedValue([]);

      await updateChildrenEventTypes({
        eventTypeId: 1,
        oldEventType: { children: [{ userId: 4 }], team: { name: "" } },
        children: [
          { hidden: false, owner: { id: 4, name: "", email: "", eventTypeSlugs: [] } },
          { hidden: false, owner: { id: 5, name: "", email: "", eventTypeSlugs: [] } },
        ],
        updatedEventType: { schedulingType: "MANAGED", slug: "something" },
        currentUserId: 1,
        prisma: prismaMock,
        profileId: null,
        updatedValues: {},
      });

      const { createdAt, updatedAt, ...expectedEvType } = evType;
      if ("workflows" in expectedEvType) delete expectedEvType.workflows;
      // Verify createManyAndReturn was called for new users (user 5)
      // Note: createManyAndReturn doesn't support nested relations like workflows, so they're handled separately
      expect(prismaMock.eventType.createManyAndReturn).toHaveBeenCalledWith({
        data: [
          {
            ...expectedEvType,
            bookingLimits: undefined,
            durationLimits: undefined,
            recurringEvent: undefined,
            eventTypeColor: undefined,
            customReplyToEmail: null,
            locations: [],
            lockTimeZoneToggleOnBookingPage: false,
            requiresBookerEmailVerification: false,
            useBookerTimezone: false,
            restrictionScheduleId: null,
            instantMeetingScheduleId: undefined,
            parentId: 1,
            userId: 5,
            rrSegmentQueryValue: undefined,
            assignRRMembersUsingSegment: false,
            useEventLevelSelectedCalendars: false,
            allowReschedulingCancelledBookings: false,
          },
        ],
        skipDuplicates: true,
        select: { id: true, userId: true },
      });

      // Verify workflowsOnEventTypes.createMany was called for new users' workflows
      expect(prismaMock.workflowsOnEventTypes.createMany).toHaveBeenCalledWith({
        data: [{ eventTypeId: 3, workflowId: 11 }],
        skipDuplicates: true,
      });

      const { profileId, rrSegmentQueryValue, createdAt: _, updatedAt: __, ...rest } = evType;
      if ("workflows" in rest) delete rest.workflows;
      expect(prismaMock.eventType.update).toHaveBeenCalledWith({
        data: {
          ...rest,
          locations: [],
          useEventLevelSelectedCalendars: undefined,
          customReplyToEmail: null,
          lockTimeZoneToggleOnBookingPage: false,
          requiresBookerEmailVerification: false,
          useBookerTimezone: false,
          restrictionScheduleId: null,
          hashedLink: {
            deleteMany: {},
          },
        },
        where: {
          userId_parentId: {
            userId: 4,
            parentId: 1,
          },
        },
      });
      // Verify workflowsOnEventTypes.findMany was called to check existing relationships
      expect(prismaMock.workflowsOnEventTypes.findMany).toHaveBeenCalledWith({
        where: {
          workflowId: { in: [11] },
          eventTypeId: { in: [2] },
        },
        select: {
          workflowId: true,
          eventTypeId: true,
        },
      });

      // Verify workflowsOnEventTypes.createMany was called for existing users' workflows
      // Since findMany returned empty array, all workflow-eventType pairs should be created
      expect(prismaMock.workflowsOnEventTypes.createMany).toHaveBeenCalledWith({
        data: [{ eventTypeId: 2, workflowId: 11 }],
        skipDuplicates: true,
      });
    });
  });

  describe("Batch execution and retry behavior", () => {
    it("processes updates in batches of 50", async () => {
      // Create 120 old users to test batching (should result in 3 batches: 50, 50, 20)
      const oldUserIds = Array.from({ length: 120 }, (_, i) => i + 1);
      const children = oldUserIds.map((id) => ({
        hidden: false,
        owner: { id, name: `User ${id}`, email: `user${id}@test.com`, eventTypeSlugs: [] },
      }));

      mockFindFirstEventType({
        metadata: { managedEventConfig: {} },
        locations: [],
      });

      // Mock findMany for existing records lookup
      // @ts-expect-error - partial mock for test purposes
      prismaMock.eventType.findMany.mockResolvedValue(oldUserIds.map((userId) => ({ userId, metadata: {} })));

      // Track update calls to verify batching
      let updateCallCount = 0;
      // @ts-expect-error - partial mock for test purposes
      prismaMock.eventType.update.mockImplementation(async () => {
        updateCallCount++;
        return {
          id: updateCallCount,
          userId: updateCallCount,
          title: "Test",
          slug: "test",
          length: 30,
          hidden: false,
          position: 0,
          teamId: null,
          schedulingType: SchedulingType.MANAGED,
          scheduleId: null,
          price: 0,
          currency: "usd",
          slotInterval: null,
          metadata: {},
          successRedirectUrl: null,
          bookingFields: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });

      const result = await updateChildrenEventTypes({
        eventTypeId: 1,
        oldEventType: { children: oldUserIds.map((userId) => ({ userId })), team: { name: "" } },
        children,
        updatedEventType: { schedulingType: "MANAGED", slug: "something" },
        currentUserId: 1,
        prisma: prismaMock,
        profileId: null,
        updatedValues: {},
      });

      // Verify all 120 users were processed
      expect(result.oldUserIds).toHaveLength(120);
      expect(updateCallCount).toBe(120);
      // Verify findMany was called once for bulk fetch optimization
      expect(prismaMock.eventType.findMany).toHaveBeenCalledTimes(1);
    });

    it("retries failed updates once", async () => {
      // Reset logger mocks before test
      vi.mocked(logger.info).mockClear();
      vi.mocked(logger.error).mockClear();

      mockFindFirstEventType({
        metadata: { managedEventConfig: {} },
        locations: [],
      });

      prismaMock.eventType.findMany.mockResolvedValue([
        { userId: 1, metadata: {} } as EventType,
        { userId: 2, metadata: {} } as EventType,
        { userId: 3, metadata: {} } as EventType,
      ]);

      // Track calls per userId to simulate failure on first attempt, success on retry
      const callCountByUser: Record<number, number> = {};

      // @ts-expect-error - partial mock for test purposes
      prismaMock.eventType.update.mockImplementation(async (args) => {
        const userId = (args.where as { userId_parentId: { userId: number } }).userId_parentId.userId;
        callCountByUser[userId] = (callCountByUser[userId] || 0) + 1;

        // User 2 fails on first attempt, succeeds on retry
        if (userId === 2 && callCountByUser[userId] === 1) {
          throw new Error("Simulated database error");
        }

        return {
          id: userId,
          userId,
          title: "Test",
          slug: "test",
          length: 30,
          hidden: false,
          position: 0,
          teamId: null,
          schedulingType: SchedulingType.MANAGED,
          scheduleId: null,
          price: 0,
          currency: "usd",
          slotInterval: null,
          metadata: {},
          successRedirectUrl: null,
          bookingFields: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        } as unknown as EventType;
      });

      const result = await updateChildrenEventTypes({
        eventTypeId: 1,
        oldEventType: { children: [{ userId: 1 }, { userId: 2 }, { userId: 3 }], team: { name: "" } },
        children: [
          { hidden: false, owner: { id: 1, name: "", email: "", eventTypeSlugs: [] } },
          { hidden: false, owner: { id: 2, name: "", email: "", eventTypeSlugs: [] } },
          { hidden: false, owner: { id: 3, name: "", email: "", eventTypeSlugs: [] } },
        ],
        updatedEventType: { schedulingType: "MANAGED", slug: "something" },
        currentUserId: 1,
        prisma: prismaMock,
        profileId: null,
        updatedValues: {},
      });

      // All 3 users should be in oldUserIds (successful after retry)
      expect(result.oldUserIds).toEqual([1, 2, 3]);
      // User 2 should have been called twice (initial + retry)
      expect(callCountByUser[2]).toBe(2);
      // Verify retry log was called
      expect(logger.info).toHaveBeenCalledWith("Retrying 1 failed updates...");
    });

    it("continues processing when some updates fail permanently", async () => {
      // Reset logger mocks before test
      vi.mocked(logger.info).mockClear();
      vi.mocked(logger.error).mockClear();

      mockFindFirstEventType({
        metadata: { managedEventConfig: {} },
        locations: [],
      });

      // Mock findMany for existing records lookup
      prismaMock.eventType.findMany.mockResolvedValue([
        { userId: 1, metadata: {} } as EventType,
        { userId: 2, metadata: {} } as EventType,
        { userId: 3, metadata: {} } as EventType,
      ]);

      // @ts-expect-error - partial mock for test purposes
      prismaMock.eventType.update.mockImplementation(async (args: Prisma.EventTypeUpdateArgs) => {
        const userId = (args.where as { userId_parentId: { userId: number } }).userId_parentId.userId;

        // User 2 always fails (permanent failure)
        if (userId === 2) {
          throw new Error("Permanent database error");
        }

        return {
          id: userId,
          userId,
          title: "Test",
          slug: "test",
          length: 30,
          hidden: false,
          position: 0,
          teamId: null,
          schedulingType: SchedulingType.MANAGED,
          scheduleId: null,
          price: 0,
          currency: "usd",
          slotInterval: null,
          metadata: {},
          successRedirectUrl: null,
          bookingFields: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        } as unknown as EventType;
      });

      const result = await updateChildrenEventTypes({
        eventTypeId: 1,
        oldEventType: { children: [{ userId: 1 }, { userId: 2 }, { userId: 3 }], team: { name: "" } },
        children: [
          { hidden: false, owner: { id: 1, name: "", email: "", eventTypeSlugs: [] } },
          { hidden: false, owner: { id: 2, name: "", email: "", eventTypeSlugs: [] } },
          { hidden: false, owner: { id: 3, name: "", email: "", eventTypeSlugs: [] } },
        ],
        updatedEventType: { schedulingType: "MANAGED", slug: "something" },
        currentUserId: 1,
        prisma: prismaMock,
        profileId: null,
        updatedValues: {},
      });

      // oldUserIds should still contain all 3 (the function returns the input, not successful ones)
      expect(result.oldUserIds).toEqual([1, 2, 3]);
      // Verify permanent failure was logged
      expect(logger.error).toHaveBeenCalledWith(
        "handleChildrenEventType - Could not update managed event-type",
        {
          parentId: 1,
          userIds: [2],
        }
      );
    });

    it("handles large scale scenarios with 100+ users efficiently", async () => {
      // Create 150 old users to test large scale handling
      const oldUserIds = Array.from({ length: 150 }, (_, i) => i + 1);
      const children = oldUserIds.map((id) => ({
        hidden: false,
        owner: { id, name: `User ${id}`, email: `user${id}@test.com`, eventTypeSlugs: [] },
      }));

      mockFindFirstEventType({
        metadata: { managedEventConfig: {} },
        locations: [],
      });

      // Mock findMany for existing records lookup - should be called ONCE (bulk optimization)
      // @ts-expect-error - partial mock for test purposes
      prismaMock.eventType.findMany.mockResolvedValue(oldUserIds.map((userId) => ({ userId, metadata: {} })));

      // Track timing to ensure batching doesn't cause sequential delays
      const updateResults: number[] = [];
      // @ts-expect-error - partial mock for test purposes
      prismaMock.eventType.update.mockImplementation(async (args) => {
        const userId = (args.where as { userId_parentId: { userId: number } }).userId_parentId.userId;
        updateResults.push(userId);

        return {
          id: userId,
          userId,
          title: "Test",
          slug: "test",
          length: 30,
          hidden: false,
          position: 0,
          teamId: null,
          schedulingType: SchedulingType.MANAGED,
          scheduleId: null,
          price: 0,
          currency: "usd",
          slotInterval: null,
          metadata: {},
          successRedirectUrl: null,
          bookingFields: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        } as unknown as EventType;
      });

      const result = await updateChildrenEventTypes({
        eventTypeId: 1,
        oldEventType: { children: oldUserIds.map((userId) => ({ userId })), team: { name: "" } },
        children,
        updatedEventType: { schedulingType: "MANAGED", slug: "something" },
        currentUserId: 1,
        prisma: prismaMock,
        profileId: null,
        updatedValues: {},
      });

      // Verify all 150 users were processed
      expect(result.oldUserIds).toHaveLength(150);
      expect(updateResults).toHaveLength(150);

      // Verify bulk fetch optimization: findMany should be called only ONCE
      // (not 150 individual findUnique calls as in the old implementation)
      expect(prismaMock.eventType.findMany).toHaveBeenCalledTimes(1);
      expect(prismaMock.eventType.findMany).toHaveBeenCalledWith({
        where: { parentId: 1, userId: { in: oldUserIds } },
        select: { userId: true, metadata: true },
      });
    });
  });

  describe("CalVideoSettings propagation", () => {
    it("Creates CalVideoSettings for new children when parent has settings", async () => {
      const { schedulingType, teamId, timeZone, ...evType } = mockFindFirstEventType({
        id: 123,
        metadata: { managedEventConfig: {} },
        locations: [],
      });

      setupTransactionMock();
      prismaMock.eventType.createManyAndReturn.mockResolvedValue([
        { ...evType, id: 456, userId: 4, schedulingType, teamId, timeZone } as unknown as EventType,
      ]);

      await updateChildrenEventTypes({
        eventTypeId: 1,
        oldEventType: { children: [], team: { name: "" } },
        children: [{ hidden: false, owner: { id: 4, name: "", email: "", eventTypeSlugs: [] } }],
        updatedEventType: { schedulingType: "MANAGED", slug: "something" },
        currentUserId: 1,
        prisma: prismaMock,
        profileId: null,
        updatedValues: {},
        calVideoSettings: {
          enableAutomaticRecordingForOrganizer: true,
          enableAutomaticTranscription: true,
        },
      });

      expect(prismaMock.calVideoSettings.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            eventTypeId: 456,
            enableAutomaticRecordingForOrganizer: true,
            enableAutomaticTranscription: true,
          }),
        ],
        skipDuplicates: true,
      });
    });

    it("Syncs/deletes CalVideoSettings for existing children based on parent settings", async () => {
      const mockExistingChildUpdate = () => {
        mockFindFirstEventType({ metadata: { managedEventConfig: {} }, locations: [] });
        // @ts-expect-error - partial mock
        prismaMock.eventType.findMany.mockResolvedValue([{ userId: 4, metadata: {} }]);
        prismaMock.eventType.update.mockResolvedValue({
          id: 789,
          userId: 4,
          schedulingType: SchedulingType.MANAGED,
        } as unknown as EventType);
      };

      const baseParams = {
        eventTypeId: 1,
        oldEventType: { children: [{ userId: 4 }], team: { name: "" } },
        children: [{ hidden: false, owner: { id: 4, name: "", email: "", eventTypeSlugs: [] } }],
        updatedEventType: { schedulingType: "MANAGED" as const, slug: "something" },
        currentUserId: 1,
        prisma: prismaMock,
        profileId: null,
        updatedValues: {},
      };

      // Test upsert when calVideoSettings provided
      mockExistingChildUpdate();
      await updateChildrenEventTypes({
        ...baseParams,
        calVideoSettings: { enableAutomaticRecordingForOrganizer: true },
      });
      expect(prismaMock.calVideoSettings.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventTypeId: 789 },
          update: expect.objectContaining({ enableAutomaticRecordingForOrganizer: true }),
          create: expect.objectContaining({ eventTypeId: 789, enableAutomaticRecordingForOrganizer: true }),
        })
      );

      // Test deleteMany when calVideoSettings is null
      vi.clearAllMocks();
      mockExistingChildUpdate();
      await updateChildrenEventTypes({ ...baseParams, calVideoSettings: null });
      expect(prismaMock.calVideoSettings.deleteMany).toHaveBeenCalledWith({
        where: { eventTypeId: { in: [789] } },
      });

      // Test no-op when calVideoSettings is undefined
      vi.clearAllMocks();
      mockExistingChildUpdate();
      await updateChildrenEventTypes({ ...baseParams, calVideoSettings: undefined });
      expect(prismaMock.calVideoSettings.upsert).not.toHaveBeenCalled();
      expect(prismaMock.calVideoSettings.deleteMany).not.toHaveBeenCalled();
    });
  });
});
