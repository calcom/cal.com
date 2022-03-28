import handleBooking from "@api/bookings/[id]";
import { createMocks } from "node-mocks-http";

import prisma from "@calcom/prisma";
import { stringifyISODate } from "@lib/utils/stringifyISODate";

describe("GET /api/bookings/[id] with valid id as string returns an booking", () => {
  it("returns a message with the specified events", async () => {
    const { req, res } = createMocks({
      method: "GET",
      query: {
        id: "1",
      },
    });
    const booking = await prisma.booking.findUnique({ where: { id: 1 } });
    await handleBooking(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({
      data: {
        ...booking,
        createdAt: stringifyISODate(booking?.createdAt),
        startTime: stringifyISODate(booking?.startTime),
        endTime: stringifyISODate(booking?.endTime)
      }
    });
  });
});

// This can never happen under our normal nextjs setup where query is always a string | string[].
// But seemed a good example for testing an error validation
describe("GET /api/bookings/[id] errors if query id is number, requires a string", () => {
  it("returns a message with the specified events", async () => {
    const { req, res } = createMocks({
      method: "GET",
      query: {
        id: 1, // passing query as a number, which should fail as nextjs will try to parse it as a string
      },
    });
    await handleBooking(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toStrictEqual([
      {
        code: "invalid_type",
        expected: "string",
        received: "number",
        path: ["id"],
        message: "Expected string, received number",
      },
    ]);
  });
});

describe("GET /api/bookings/[id] an id not present in db like 0, throws 404 not found", () => {
  it("returns a message with the specified events", async () => {
    const { req, res } = createMocks({
      method: "GET",
      query: {
        id: "0", // There's no booking type with id 0
      },
    });
    await handleBooking(req, res);

    expect(res._getStatusCode()).toBe(404);
    expect(JSON.parse(res._getData())).toStrictEqual({ message: "Event type not found" });
  });
});

describe("POST /api/bookings/[id] fails, only GET allowed", () => {
  it("returns a message with the specified events", async () => {
    const { req, res } = createMocks({
      method: "POST", // This POST method is not allowed
      query: {
        id: "1",
      },
    });
    await handleBooking(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toStrictEqual({ message: "Only GET Method allowed" });
  });
});


