import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, expect, test, beforeAll, afterAll } from "vitest";

import { prisma } from "@calcom/prisma";
import type { User, Team, EventType, Schedule } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";

import handler from "../../../../pages/api/event-types/[id]/_get";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

describe("GET /api/event-types/[id]", () => {
  let testUser: User;
  let adminUser: User;
  let teamUser: User;
  let testTeam: Team;
  let testSchedule: Schedule;
  let complexEventType: EventType;
  let seatsEventType: EventType;
  let maxSeatsEventType: EventType;
  let nullSeatsEventType: EventType;
  let customFieldsEventType: EventType;
  let teamEventType: EventType;
  let metadataEventType: EventType;

  beforeAll(async () => {
    const timestamp = Date.now();

    const createTestUser = prisma.user.create({
      data: {
        username: `test-user-${timestamp}`,
        name: "Test User",
        email: `test-user-${timestamp}@example.com`,
      },
    });

    const createAdminUser = prisma.user.create({
      data: {
        username: `admin-user-${timestamp}`,
        name: "Admin User",
        email: `admin-user-${timestamp}@example.com`,
      },
    });

    const createTeamUser = prisma.user.create({
      data: {
        username: `team-user-${timestamp}`,
        name: "Team User",
        email: `team-user-${timestamp}@example.com`,
      },
    });

    [testUser, adminUser, teamUser] = await Promise.all([createTestUser, createAdminUser, createTeamUser]);

    // Create a schedule for the test user (required for event types with scheduleId)
    testSchedule = await prisma.schedule.create({
      data: {
        name: `Test Schedule ${timestamp}`,
        userId: testUser.id,
        timeZone: "UTC",
      },
    });

    testTeam = await prisma.team.create({
      data: {
        name: `Test Team ${timestamp}`,
        slug: `test-team-${timestamp}`,
        members: {
          createMany: {
            data: [
              {
                userId: teamUser.id,
                role: MembershipRole.MEMBER,
                accepted: true,
              },
            ],
          },
        },
      },
    });

    const createComplexEventType = prisma.eventType.create({
      data: {
        title: "Complex Event Type",
        slug: `complex-event-${timestamp}`,
        length: 60,
        userId: testUser.id,
        scheduleId: testSchedule.id,
        locations: [
          {
            type: "integrations:zoom",
            link: "https://zoom.us/j/123456789",
            displayLocationPublicly: true,
          },
          {
            type: "attendeeInPerson",
            address: "123 Main St, City, State 12345",
            displayLocationPublicly: false,
          },
          {
            type: "phone",
            hostPhoneNumber: "+1234567890",
          },
        ],
        bookingFields: [
          {
            name: "name",
            type: "name",
            required: true,
            editable: "system",
            defaultLabel: "your_name",
          },
          {
            name: "email",
            type: "email",
            required: true,
            editable: "system-but-optional",
            defaultLabel: "email_address",
          },
          {
            name: "customField",
            type: "text",
            required: false,
            editable: "user",
            label: "Custom Question",
            placeholder: "Enter your answer",
          },
        ],
        metadata: {
          additionalNotesRequired: true,
        },
      },
    });

    const createSeatsEventType = prisma.eventType.create({
      data: {
        title: "Seats Event Type",
        slug: `seats-event-${timestamp}`,
        length: 60,
        userId: testUser.id,
        scheduleId: testSchedule.id,
        seatsPerTimeSlot: 10,
        seatsShowAttendees: true,
        seatsShowAvailabilityCount: false,
      },
    });

    const createMaxSeatsEventType = prisma.eventType.create({
      data: {
        title: "Max Seats Event Type",
        slug: `max-seats-event-${timestamp}`,
        length: 60,
        userId: testUser.id,
        scheduleId: testSchedule.id,
        seatsPerTimeSlot: 1000,
        seatsShowAttendees: false,
        seatsShowAvailabilityCount: true,
      },
    });

    const createNullSeatsEventType = prisma.eventType.create({
      data: {
        title: "Null Seats Event Type",
        slug: `null-seats-event-${timestamp}`,
        length: 60,
        userId: testUser.id,
        scheduleId: testSchedule.id,
        seatsPerTimeSlot: null,
        seatsShowAttendees: null,
        seatsShowAvailabilityCount: null,
      },
    });

    const createCustomFieldsEventType = prisma.eventType.create({
      data: {
        title: "Custom Fields Event Type",
        slug: `custom-fields-event-${timestamp}`,
        length: 60,
        userId: testUser.id,
        scheduleId: testSchedule.id,
        bookingFields: [
          {
            name: "name",
            type: "name",
            required: true,
            editable: "system",
            defaultLabel: "your_name",
            variant: "fullName",
          },
          {
            name: "customSelect",
            type: "select",
            required: true,
            editable: "user",
            label: "Preferred Time",
            options: [
              { label: "Morning", value: "morning" },
              { label: "Afternoon", value: "afternoon" },
              { label: "Evening", value: "evening" },
            ],
          },
          {
            name: "customTextarea",
            type: "textarea",
            required: false,
            editable: "user",
            label: "Additional Information",
            placeholder: "Please provide any additional details",
            maxLength: 500,
          },
        ],
      },
    });

    const createTeamEventType = prisma.eventType.create({
      data: {
        title: "Team Event Type",
        slug: `team-event-${timestamp}`,
        length: 60,
        teamId: testTeam.id,
        schedulingType: "COLLECTIVE",
        assignAllTeamMembers: true,
      },
    });

    const createMetadataEventType = prisma.eventType.create({
      data: {
        title: "Metadata Event Type",
        slug: `metadata-event-${timestamp}`,
        length: 60,
        userId: testUser.id,
        scheduleId: testSchedule.id,
        metadata: {
          additionalNotesRequired: true,
          disableStandardEmails: false,
          requiresConfirmationThreshold: {
            time: 30,
            unit: "minutes",
          },
          apps: {
            stripe: {
              price: 2500,
              currency: "usd",
            },
          },
        },
        recurringEvent: {
          freq: 2,
          count: 12,
          interval: 1,
        },
        bookingLimits: {
          PER_DAY: 3,
          PER_WEEK: 10,
        },
        durationLimits: {
          PER_DAY: 480,
        },
      },
    });

    [
      complexEventType,
      seatsEventType,
      maxSeatsEventType,
      nullSeatsEventType,
      customFieldsEventType,
      teamEventType,
      metadataEventType,
    ] = await Promise.all([
      createComplexEventType,
      createSeatsEventType,
      createMaxSeatsEventType,
      createNullSeatsEventType,
      createCustomFieldsEventType,
      createTeamEventType,
      createMetadataEventType,
    ]);
  });

  afterAll(async () => {
    await prisma.eventType.deleteMany({
      where: {
        id: {
          in: [
            complexEventType.id,
            seatsEventType.id,
            maxSeatsEventType.id,
            nullSeatsEventType.id,
            customFieldsEventType.id,
            teamEventType.id,
            metadataEventType.id,
          ],
        },
      },
    });

    await prisma.team.delete({
      where: { id: testTeam.id },
    });

    await prisma.schedule.delete({
      where: { id: testSchedule.id },
    });

    await prisma.user.deleteMany({
      where: {
        id: {
          in: [testUser.id, adminUser.id, teamUser.id],
        },
      },
    });
  });

  describe("Errors", () => {
    test("Returns 403 if user not admin/team member/event owner", async () => {
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        body: {},
        query: {
          id: complexEventType.id,
        },
      });

      req.userId = adminUser.id;

      await expect(handler(req)).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 403,
        })
      );
    });
  });

  describe("Success", async () => {
    test("Returns event type if user is admin", async () => {
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        body: {},
        query: {
          id: complexEventType.id,
        },
      });

      req.isSystemWideAdmin = true;
      req.userId = adminUser.id;
      const responseData = await handler(req);

      expect(responseData.event_type.id).toEqual(complexEventType.id);
    });

    test("Returns event type if user is in team associated with event type", async () => {
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        body: {},
        query: {
          id: teamEventType.id,
        },
      });

      req.isSystemWideAdmin = false;
      req.userId = teamUser.id;
      const responseData = await handler(req);

      expect(responseData.event_type.id).toEqual(teamEventType.id);
    });

    test("Returns event type if user is the event type owner", async () => {
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        body: {},
        query: {
          id: complexEventType.id,
        },
      });

      req.isSystemWideAdmin = false;
      req.userId = testUser.id;
      const responseData = await handler(req);

      expect(responseData.event_type.id).toEqual(complexEventType.id);
    });
  });

  describe("Data Validation", () => {
    test("Returns properly validated event type with complex locations", async () => {
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        body: {},
        query: {
          id: complexEventType.id,
        },
      });

      req.userId = testUser.id;
      const responseData = await handler(req);

      expect(responseData.event_type).toBeDefined();
      expect(responseData.event_type.id).toBe(complexEventType.id);
      expect(responseData.event_type.locations).toHaveLength(3);
      expect(responseData.event_type.bookingFields).toHaveLength(3);
      expect(responseData.event_type.metadata).toBeDefined();

      const locations = responseData.event_type.locations as Array<Record<string, unknown>>;
      expect(locations[0]).toMatchObject({
        type: "integrations:zoom",
        link: "https://zoom.us/j/123456789",
      });

      const bookingFields = responseData.event_type.bookingFields as Array<Record<string, unknown>>;
      expect(bookingFields[0]).toMatchObject({
        name: "name",
        type: "name",
        required: true,
        editable: "system",
      });
    });

    test("Returns properly validated event type with seats configuration", async () => {
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        body: {},
        query: {
          id: seatsEventType.id,
        },
      });

      req.userId = testUser.id;
      const responseData = await handler(req);

      expect(responseData.event_type.seatsPerTimeSlot).toBe(10);
      expect(responseData.event_type.seatsShowAttendees).toBe(true);
      expect(responseData.event_type.seatsShowAvailabilityCount).toBe(false);
    });

    test("Returns properly validated event type with maximum seats", async () => {
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        body: {},
        query: {
          id: maxSeatsEventType.id,
        },
      });

      req.userId = testUser.id;
      const responseData = await handler(req);

      expect(responseData.event_type.seatsPerTimeSlot).toBe(1000);
    });

    test("Returns properly validated event type with null seats", async () => {
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        body: {},
        query: {
          id: nullSeatsEventType.id,
        },
      });

      req.userId = testUser.id;
      const responseData = await handler(req);

      expect(responseData.event_type.seatsPerTimeSlot).toBeNull();
      expect(responseData.event_type.seatsShowAttendees).toBeNull();
      expect(responseData.event_type.seatsShowAvailabilityCount).toBeNull();
    });

    test("Returns properly validated event type with custom inputs and booking fields", async () => {
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        body: {},
        query: {
          id: customFieldsEventType.id,
        },
      });

      req.userId = testUser.id;
      const responseData = await handler(req);

      expect(responseData.event_type.bookingFields).toHaveLength(3);

      const bookingFields = responseData.event_type.bookingFields as Array<{
        name: string;
        options?: Array<{ label: string; value: string }>;
        maxLength?: number;
      }>;
      const selectField = bookingFields.find((f) => f.name === "customSelect");
      expect(selectField?.options).toHaveLength(3);
      expect(selectField?.options?.[0]).toMatchObject({
        label: "Morning",
        value: "morning",
      });

      const textareaField = bookingFields.find((f) => f.name === "customTextarea");
      expect(textareaField?.maxLength).toBe(500);
    });

    test("Returns properly validated event type with team configuration", async () => {
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        body: {},
        query: {
          id: teamEventType.id,
        },
      });

      req.isSystemWideAdmin = false;
      req.userId = teamUser.id;
      const responseData = await handler(req);

      expect(responseData.event_type.teamId).toBe(testTeam.id);
      expect(responseData.event_type.schedulingType).toBe("COLLECTIVE");
    });

    test("Returns properly validated event type with complex metadata", async () => {
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        body: {},
        query: {
          id: metadataEventType.id,
        },
      });

      req.userId = testUser.id;
      const responseData = await handler(req);

      expect(responseData.event_type.metadata).toBeDefined();
      expect(responseData.event_type.recurringEvent).toMatchObject({
        freq: 2,
        count: 12,
        interval: 1,
      });
      expect(responseData.event_type.bookingLimits).toMatchObject({
        PER_DAY: 3,
        PER_WEEK: 10,
      });
      expect(responseData.event_type.durationLimits).toMatchObject({
        PER_DAY: 480,
      });
    });
  });
});
