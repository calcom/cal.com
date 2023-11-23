// TODO: Fix tests (These test were never running due to the vitest workspace config)
import prismaMock from "../../../../../tests/libs/__mocks__/prisma";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, expect, test, vi } from "vitest";

import dayjs from "@calcom/dayjs";
import sendPayload from "@calcom/features/webhooks/lib/sendPayload";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { buildBooking, buildEventType, buildWebhook } from "@calcom/lib/test/builder";
import prisma from "@calcom/prisma";

import handler from "../../../pages/api/bookings/_post";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;
vi.mock("@calcom/features/webhooks/lib/sendPayload");
vi.mock("@calcom/lib/server/i18n", () => {
  return {
    getTranslation: (key: string) => key,
  };
});

describe.skipIf(true)("POST /api/bookings", () => {
  describe("Errors", () => {
    test("Missing required data", async () => {
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: {},
      });

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toEqual(
        expect.objectContaining({
          message:
            "invalid_type in 'eventTypeId': Required; invalid_type in 'title': Required; invalid_type in 'startTime': Required; invalid_type in 'startTime': Required; invalid_type in 'endTime': Required; invalid_type in 'endTime': Required",
        })
      );
    });

    test("Invalid eventTypeId", async () => {
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: {
          title: "test",
          eventTypeId: 2,
          startTime: dayjs().toDate(),
          endTime: dayjs().add(1, "day").toDate(),
        },
        prisma,
      });

      prismaMock.eventType.findUnique.mockResolvedValue(null);

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual(
        expect.objectContaining({
          message:
            "'invalid_type' in 'email': Required; 'invalid_type' in 'end': Required; 'invalid_type' in 'location': Required; 'invalid_type' in 'name': Required; 'invalid_type' in 'start': Required; 'invalid_type' in 'timeZone': Required; 'invalid_type' in 'language': Required; 'invalid_type' in 'customInputs': Required; 'invalid_type' in 'metadata': Required",
        })
      );
    });

    test("Missing recurringCount", async () => {
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: {
          title: "test",
          eventTypeId: 2,
          startTime: dayjs().toDate(),
          endTime: dayjs().add(1, "day").toDate(),
        },
        prisma,
      });

      prismaMock.eventType.findUnique.mockResolvedValue(
        buildEventType({ recurringEvent: { freq: 2, count: 12, interval: 1 } })
      );

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual(
        expect.objectContaining({
          message:
            "'invalid_type' in 'email': Required; 'invalid_type' in 'end': Required; 'invalid_type' in 'location': Required; 'invalid_type' in 'name': Required; 'invalid_type' in 'start': Required; 'invalid_type' in 'timeZone': Required; 'invalid_type' in 'language': Required; 'invalid_type' in 'customInputs': Required; 'invalid_type' in 'metadata': Required",
        })
      );
    });

    test("Invalid recurringCount", async () => {
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: {
          title: "test",
          eventTypeId: 2,
          startTime: dayjs().toDate(),
          endTime: dayjs().add(1, "day").toDate(),
          recurringCount: 15,
        },
        prisma,
      });

      prismaMock.eventType.findUnique.mockResolvedValue(
        buildEventType({ recurringEvent: { freq: 2, count: 12, interval: 1 } })
      );

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual(
        expect.objectContaining({
          message:
            "'invalid_type' in 'email': Required; 'invalid_type' in 'end': Required; 'invalid_type' in 'location': Required; 'invalid_type' in 'name': Required; 'invalid_type' in 'start': Required; 'invalid_type' in 'timeZone': Required; 'invalid_type' in 'language': Required; 'invalid_type' in 'customInputs': Required; 'invalid_type' in 'metadata': Required",
        })
      );
    });

    test("No available users", async () => {
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: {
          name: "test",
          start: dayjs().format(),
          end: dayjs().add(1, "day").format(),
          eventTypeId: 2,
          email: "test@example.com",
          location: "Cal.com Video",
          timeZone: "America/Montevideo",
          language: "en",
          customInputs: [],
          metadata: {},
          userId: 4,
        },
        prisma,
      });

      prismaMock.eventType.findUniqueOrThrow.mockResolvedValue(buildEventType());

      await handler(req, res);
      console.log({ statusCode: res._getStatusCode(), data: JSON.parse(res._getData()) });

      expect(res._getStatusCode()).toBe(500);
      expect(JSON.parse(res._getData())).toEqual(
        expect.objectContaining({
          message: ErrorCode.NoAvailableUsersFound,
        })
      );
    });
  });

  describe("Success", () => {
    describe("Regular event-type", () => {
      test("Creates one single booking", async () => {
        const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
          method: "POST",
          body: {
            name: "test",
            start: dayjs().format(),
            end: dayjs().add(1, "day").format(),
            eventTypeId: 2,
            email: "test@example.com",
            location: "Cal.com Video",
            timeZone: "America/Montevideo",
            language: "en",
            customInputs: [],
            metadata: {},
            userId: 4,
          },
          prisma,
        });

        prismaMock.eventType.findUniqueOrThrow.mockResolvedValue(buildEventType());
        prismaMock.booking.findMany.mockResolvedValue([]);

        await handler(req, res);
        console.log({ statusCode: res._getStatusCode(), data: JSON.parse(res._getData()) });

        expect(prismaMock.booking.create).toHaveBeenCalledTimes(1);
      });
    });

    describe("Recurring event-type", () => {
      test("Creates multiple bookings", async () => {
        const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
          method: "POST",
          body: {
            title: "test",
            eventTypeId: 2,
            startTime: dayjs().toDate(),
            endTime: dayjs().add(1, "day").toDate(),
            recurringCount: 12,
          },
          prisma,
        });

        prismaMock.eventType.findUnique.mockResolvedValue(
          buildEventType({ recurringEvent: { freq: 2, count: 12, interval: 1 } })
        );

        Array.from(Array(12).keys()).map(async () => {
          prismaMock.booking.create.mockResolvedValue(buildBooking());
        });

        prismaMock.webhook.findMany.mockResolvedValue([]);

        await handler(req, res);
        const data = JSON.parse(res._getData());

        expect(prismaMock.booking.create).toHaveBeenCalledTimes(12);
        expect(res._getStatusCode()).toBe(201);
        expect(data.message).toEqual("Bookings created successfully.");
        expect(data.bookings.length).toEqual(12);
      });
    });
    test("Notifies multiple bookings", async () => {
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: {
          title: "test",
          eventTypeId: 2,
          startTime: dayjs().toDate(),
          endTime: dayjs().add(1, "day").toDate(),
          recurringCount: 12,
        },
        prisma,
      });

      prismaMock.eventType.findUnique.mockResolvedValue(
        buildEventType({ recurringEvent: { freq: 2, count: 12, interval: 1 } })
      );

      const createdAt = new Date();
      Array.from(Array(12).keys()).map(async () => {
        prismaMock.booking.create.mockResolvedValue(buildBooking({ createdAt }));
      });

      const mockedWebhooks = [
        buildWebhook({
          subscriberUrl: "http://mockedURL1.com",
          createdAt,
          eventTypeId: 1,
          secret: "secret1",
        }),
        buildWebhook({
          subscriberUrl: "http://mockedURL2.com",
          createdAt,
          eventTypeId: 2,
          secret: "secret2",
        }),
      ];
      prismaMock.webhook.findMany.mockResolvedValue(mockedWebhooks);

      await handler(req, res);
      const data = JSON.parse(res._getData());

      expect(sendPayload).toHaveBeenCalledTimes(24);
      expect(data.message).toEqual("Bookings created successfully.");
      expect(data.bookings.length).toEqual(12);
    });
  });
});
