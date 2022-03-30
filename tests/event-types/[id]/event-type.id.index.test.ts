import handleEventType from "@api/event-types/[id]";
import { createMocks } from "node-mocks-http";

import prisma from "@calcom/prisma";

describe("GET /api/event-types/[id] with valid id as string returns an event-type", () => {
  it("returns a message with the specified events", async () => {
    const { req, res } = createMocks({
      method: "GET",
      query: {
        id: "1",
      },
    });
    const event = await prisma.eventType.findUnique({ where: { id: 1 } });
    await handleEventType(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toStrictEqual({ data: event });
  });
});

// This can never happen under our normal nextjs setup where query is always a string | string[].
// But seemed a good example for testing an error validation
describe("GET /api/event-types/[id] errors if query id is number, requires a string", () => {
  it("returns a message with the specified events", async () => {
    const { req, res } = createMocks({
      method: "GET",
      query: {
        id: 1, // passing query as a number, which should fail as nextjs will try to parse it as a string
      },
    });
    await handleEventType(req, res);

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

describe("GET /api/event-types/[id] an id not present in db like 0, throws 404 not found", () => {
  it("returns a message with the specified events", async () => {
    const { req, res } = createMocks({
      method: "GET",
      query: {
        id: "0", // There's no event type with id 0
      },
    });
    await handleEventType(req, res);

    expect(res._getStatusCode()).toBe(404);
    expect(JSON.parse(res._getData())).toStrictEqual({ message: "Event type not found" });
  });
});

describe("POST /api/event-types/[id] fails, only GET allowed", () => {
  it("returns a message with the specified events", async () => {
    const { req, res } = createMocks({
      method: "POST", // This POST method is not allowed
      query: {
        id: "1",
      },
    });
    await handleEventType(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toStrictEqual({ message: "Only GET Method allowed" });
  });
});
