/* eslint-disable @typescript-eslint/no-unused-vars */
import prismaMock from "../../../../tests/libs/__mocks__/prismaMock";

import { describe, expect, it, vi } from "vitest";

import updateChildrenEventTypes from "@calcom/features/ee/managed-event-types/lib/handleChildrenEventTypes";
import { buildEventType } from "@calcom/lib/test/builder";
import type { EventType, User, WorkflowsOnEventTypes } from "@calcom/prisma/client";
import type { Prisma } from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/enums";

// Helper to setup transaction mock that executes the callback with the prisma mock
const setupTransactionMock = () => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
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
      // @ts-ignore
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
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
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
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
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
        ...evType
      } = mockFindFirstEventType({
        metadata: { managedEventConfig: {} },
        locations: [],
      });
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
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
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
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
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
        ...evType
      } = mockFindFirstEventType({
        metadata: { managedEventConfig: {} },
        locations: [],
      });
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
      };
      prismaMock.eventType.createManyAndReturn.mockResolvedValue([createdEventType]);

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
        skipDuplicates: false,
      });
    });
  });
});
