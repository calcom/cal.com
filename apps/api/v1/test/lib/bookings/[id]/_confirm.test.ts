import {
  createBookingScenario,
  getBooker,
  getOrganizer,
  getScenarioData,
  TestData,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import { createMockNextJsRequest } from "@calcom/web/test/utils/bookingScenario/createMockNextJsRequest";
import { getMockRequestDataForBooking } from "@calcom/web/test/utils/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, expect, test } from "vitest";

import handler from "../../../../pages/api/bookings/[id]/_confirm";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

describe("Confirm /api/bookings/${id}/confirm", () => {
  setupAndTeardown();
  describe("Errors", () => {
    test("Missing required data", async () => {
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: {},
        query: {
          id: 10,
        },
      });

      await handler(req, res);
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toEqual(
        expect.objectContaining({
          message: "invalid_type in 'confirmed': Required",
        })
      );
    });
  });

  describe("Success", () => {
    async function createMockBooking() {
      const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
      });
      const scenarioData = getScenarioData({
        eventTypes: [
          {
            id: 1,
            slotInterval: 30,
            requiresConfirmation: true,
            length: 30,
            users: [
              {
                id: 101,
              },
            ],
          },
        ],
        organizer,
        apps: [],
      });
      await createBookingScenario(scenarioData);

      const mockBookingData = getMockRequestDataForBooking({
        data: {
          eventTypeId: 1,
          responses: {
            email: booker.email,
            name: booker.name,
            location: { optionValue: "", value: "New York" },
          },
        },
      });

      const { req: bookingReq } = createMockNextJsRequest({
        method: "POST",
        body: mockBookingData,
      });

      return await handleNewBooking(bookingReq);
    }
    test("Booking Accepted", async () => {
      const createdBooking = await createMockBooking();
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: {
          confirmed: true,
        },
        query: {
          id: createdBooking.id,
        },
      });
      await handler(req, res);
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(
        expect.objectContaining({
          message: "confirmed",
          status: "ACCEPTED",
        })
      );
    });
    test("Booking Rejected", async () => {
      const createdBooking = await createMockBooking();
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: {
          confirmed: false,
        },
        query: {
          id: createdBooking.id,
        },
      });
      await handler(req, res);
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(
        expect.objectContaining({
          message: "confirmed",
          status: "REJECTED",
        })
      );
    });
  });
});
