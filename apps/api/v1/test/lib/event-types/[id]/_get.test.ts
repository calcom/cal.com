import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, expect, test } from "vitest";

import { buildEventType } from "@calcom/lib/test/builder";
import { MembershipRole } from "@calcom/prisma/enums";

import handler from "../../../../pages/api/event-types/[id]/_get";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

describe("GET /api/event-types/[id]", () => {
  describe("Errors", () => {
    test("Returns 403 if user not admin/team member/event owner", async () => {
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        body: {},
        query: {
          id: 123456,
        },
      });

      prismaMock.eventType.findUnique.mockResolvedValue(
        buildEventType({
          id: 123456,
          userId: 444444,
        })
      );

      req.userId = 333333;

      await expect(handler(req)).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 403,
        })
      );
    });
    test("Returns 404 if event type not found", async () => {
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        body: {},
        query: {
          id: 123456,
        },
      });

      req.isSystemWideAdmin = true;

      prismaMock.eventType.findUnique.mockResolvedValue(null);

      req.userId = 333333;

      await expect(handler(req)).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 404,
        })
      );
    });
  });

  describe("Success", async () => {
    test("Returns event type if user is admin", async () => {
      const eventTypeId = 123456;
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        body: {},
        query: {
          id: eventTypeId,
        },
      });

      prismaMock.eventType.findUnique.mockResolvedValue(
        buildEventType({
          id: eventTypeId,
        })
      );

      req.isSystemWideAdmin = true;
      req.userId = 333333;

      const responseData = await handler(req);

      expect(responseData.event_type.id).toEqual(eventTypeId);
    });

    test("Returns event type if user is in team associated with event type", async () => {
      const eventTypeId = 123456;
      const teamId = 9999;
      const userId = 333333;
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        body: {},
        query: {
          id: eventTypeId,
        },
      });

      prismaMock.eventType.findUnique.mockResolvedValue(
        buildEventType({
          id: eventTypeId,
          teamId,
        })
      );

      prismaMock.team.findFirst.mockResolvedValue({
        id: teamId,
        // @ts-expect-error requires mockDeep which will be introduced in the Prisma 6.7.0 upgrade, ignore for now.
        members: [
          {
            userId,
          },
        ],
      });

      req.isSystemWideAdmin = false;
      req.userId = userId;

      const responseData = await handler(req);

      expect(responseData.event_type.id).toEqual(eventTypeId);
      expect(prismaMock.team.findFirst).toHaveBeenCalledWith({
        where: {
          id: teamId,
          members: {
            some: {
              userId: req.userId,
              role: {
                in: [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.MEMBER],
              },
            },
          },
        },
      });
    });

    test("Returns event type if user is the event type owner", async () => {
      const eventTypeId = 123456;
      const userId = 333333;
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        body: {},
        query: {
          id: eventTypeId,
        },
      });

      prismaMock.eventType.findUnique.mockResolvedValue(
        buildEventType({
          id: eventTypeId,
          userId,
          scheduleId: 1111,
        })
      );

      req.isSystemWideAdmin = false;
      req.userId = userId;

      const responseData = await handler(req);

      expect(responseData.event_type.id).toEqual(eventTypeId);
      expect(prismaMock.team.findFirst).not.toHaveBeenCalled();
    });
  });

  describe("Data Validation", () => {
    test("Returns properly validated event type with complex locations", async () => {
      const eventTypeId = 123456;
      const userId = 333333;
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        body: {},
        query: {
          id: eventTypeId,
        },
      });

      const complexEventType = buildEventType({
        id: eventTypeId,
        userId,
        scheduleId: 1111,
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
      });

      prismaMock.eventType.findUnique.mockResolvedValue(complexEventType);

      req.userId = userId;
      const responseData = await handler(req);

      expect(responseData.event_type).toBeDefined();
      expect(responseData.event_type.id).toBe(eventTypeId);
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
      const eventTypeId = 123456;
      const userId = 333333;
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        body: {},
        query: {
          id: eventTypeId,
        },
      });

      const seatsEventType = buildEventType({
        id: eventTypeId,
        userId,
        scheduleId: 1111,
        seatsPerTimeSlot: 10,
        seatsShowAttendees: true,
        seatsShowAvailabilityCount: false,
      });

      prismaMock.eventType.findUnique.mockResolvedValue(seatsEventType);

      req.userId = userId;
      const responseData = await handler(req);

      expect(responseData.event_type.seatsPerTimeSlot).toBe(10);
      expect(responseData.event_type.seatsShowAttendees).toBe(true);
      expect(responseData.event_type.seatsShowAvailabilityCount).toBe(false);
    });

    test("Returns properly validated event type with maximum seats", async () => {
      const eventTypeId = 123456;
      const userId = 333333;
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        body: {},
        query: {
          id: eventTypeId,
        },
      });

      const maxSeatsEventType = buildEventType({
        id: eventTypeId,
        userId,
        scheduleId: 1111,
        seatsPerTimeSlot: 1000,
        seatsShowAttendees: false,
        seatsShowAvailabilityCount: true,
      });

      prismaMock.eventType.findUnique.mockResolvedValue(maxSeatsEventType);

      req.userId = userId;
      const responseData = await handler(req);

      expect(responseData.event_type.seatsPerTimeSlot).toBe(1000);
    });

    test("Returns properly validated event type with null seats", async () => {
      const eventTypeId = 123456;
      const userId = 333333;
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        body: {},
        query: {
          id: eventTypeId,
        },
      });

      const nullSeatsEventType = buildEventType({
        id: eventTypeId,
        userId,
        scheduleId: 1111,
        seatsPerTimeSlot: null,
        seatsShowAttendees: null,
        seatsShowAvailabilityCount: null,
      });

      prismaMock.eventType.findUnique.mockResolvedValue(nullSeatsEventType);

      req.userId = userId;
      const responseData = await handler(req);

      expect(responseData.event_type.seatsPerTimeSlot).toBeNull();
      expect(responseData.event_type.seatsShowAttendees).toBeNull();
      expect(responseData.event_type.seatsShowAvailabilityCount).toBeNull();
    });

    test("Returns properly validated event type with custom inputs and booking fields", async () => {
      const eventTypeId = 123456;
      const userId = 333333;
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        body: {},
        query: {
          id: eventTypeId,
        },
      });

      const customFieldsEventType = buildEventType({
        id: eventTypeId,
        userId,
        scheduleId: 1111,
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
      });

      prismaMock.eventType.findUnique.mockResolvedValue(customFieldsEventType);

      req.userId = userId;
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
      const eventTypeId = 123456;
      const teamId = 9999;
      const userId = 333333;
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        body: {},
        query: {
          id: eventTypeId,
        },
      });

      const teamEventType = buildEventType({
        id: eventTypeId,
        teamId,
        userId: null,
        schedulingType: "COLLECTIVE",
        assignAllTeamMembers: true,
      });

      prismaMock.eventType.findUnique.mockResolvedValue(teamEventType);
      prismaMock.team.findFirst.mockResolvedValue({
        id: teamId,
        // @ts-expect-error requires mockDeep which will be introduced in the Prisma 6.7.0 upgrade, ignore for now.
        members: [
          {
            userId,
          },
        ],
      });

      req.isSystemWideAdmin = false;
      req.userId = userId;
      const responseData = await handler(req);

      expect(responseData.event_type.teamId).toBe(teamId);
      expect(responseData.event_type.schedulingType).toBe("COLLECTIVE");
    });

    test("Returns properly validated event type with complex metadata", async () => {
      const eventTypeId = 123456;
      const userId = 333333;
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        body: {},
        query: {
          id: eventTypeId,
        },
      });

      const metadataEventType = buildEventType({
        id: eventTypeId,
        userId,
        scheduleId: 1111,
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
      });

      prismaMock.eventType.findUnique.mockResolvedValue(metadataEventType);

      req.userId = userId;
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
