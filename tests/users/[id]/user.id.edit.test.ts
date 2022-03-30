import handleEventTypeEdit from "@api/event-types/[id]/edit";
import { createMocks } from "node-mocks-http";

import prisma from "@calcom/prisma";

describe("PATCH /api/event-types/[id]/edit with valid id and body updates an event-type", () => {
  it("returns a message with the specified events", async () => {
    const { req, res } = createMocks({
      method: "PATCH",
      query: {
        id: "2",
      },
      body: {
        title: "Updated title",
        slug: "updated-slug",
        length: 1,
      },
    });
    const event = await prisma.eventType.findUnique({ where: { id: parseInt(req.query.id) } });
    await handleEventTypeEdit(req, res);

    expect(res._getStatusCode()).toBe(200);
    if (event) event.title = "Updated title";
    expect(JSON.parse(res._getData())).toStrictEqual({ data: event });
  });
});

describe("PATCH /api/event-types/[id]/edit with invalid id returns 404", () => {
  it("returns a message with the specified events", async () => {
    const { req, res } = createMocks({
      method: "PATCH",
      query: {
        id: "0",
      },
      body: {
        title: "Updated title",
        slug: "updated-slug",
        length: 1,
      },
    });
    const event = await prisma.eventType.findUnique({ where: { id: parseInt(req.query.id) } });
    await handleEventTypeEdit(req, res);

    expect(res._getStatusCode()).toBe(404);
    if (event) event.title = "Updated title";
    expect(JSON.parse(res._getData())).toStrictEqual({
      error: {
        clientVersion: "3.10.0",
        code: "P2025",
        meta: {
          cause: "Record to update not found.",
        },
      },
      message: "Event type with ID 0 not found and wasn't updated",
    });
  });
});

describe("PATCH /api/event-types/[id]/edit with valid id and no body returns 400 error and zod validation errors", () => {
  it("returns a message with the specified events", async () => {
    const { req, res } = createMocks({
      method: "PATCH",
      query: {
        id: "2",
      },
    });
    await handleEventTypeEdit(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toStrictEqual([
      {
        code: "invalid_type",
        expected: "string",
        message: "Required",
        path: ["title"],
        received: "undefined",
      },
      {
        code: "invalid_type",
        expected: "string",
        message: "Required",
        path: ["slug"],
        received: "undefined",
      },
      {
        code: "invalid_type",
        expected: "number",
        message: "Required",
        path: ["length"],
        received: "undefined",
      },
    ]);
  });
});

describe("POST /api/event-types/[id]/edit fails, only PATCH allowed", () => {
  it("returns a message with the specified events", async () => {
    const { req, res } = createMocks({
      method: "POST", // This POST method is not allowed
      query: {
        id: "1",
      },
      body: {
        title: "Updated title",
        slug: "updated-slug",
        length: 1,
      },
    });
    await handleEventTypeEdit(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toStrictEqual({
      message: "Only PATCH Method allowed for updating event-types",
    });
  });
});
