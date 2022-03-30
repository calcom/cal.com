import handleApiKeys from "@api/event-types";
import { createMocks } from "node-mocks-http";

import prisma from "@calcom/prisma";

// import {stringifyISODate} from "@lib/utils/stringifyISODate";

describe("GET /api/event-types without any params", () => {
  it("returns a message with the specified eventTypes", async () => {
    const { req, res } = createMocks({
      method: "GET",
      query: {},
    });
    const eventTypes = await prisma.eventType.findMany();
    await handleApiKeys(req, res);

    expect(res._getStatusCode()).toBe(200);
    // eventTypes = eventTypes.map(eventType => (eventType = {...eventType, createdAt: stringifyISODate(eventType?.createdAt), expiresAt: stringifyISODate(eventType?.expiresAt)}));
    expect(JSON.parse(res._getData())).toStrictEqual(JSON.parse(JSON.stringify({ data: { ...eventTypes } })));
  });
});

describe("POST /api/event-types/ fails, only GET allowed", () => {
  it("returns a message with the specified eventTypes", async () => {
    const { req, res } = createMocks({
      method: "POST", // This POST method is not allowed
    });
    await handleApiKeys(req, res);
    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toStrictEqual({ message: "Only GET Method allowed" });
  });
});
