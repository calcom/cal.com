import { createMocks } from "node-mocks-http";

import prisma from "@calcom/prisma";
import { EventType } from "@calcom/prisma/client";

import handleEvent from "../pages/api/event-types/[id]";

afterAll((done) => {
  prisma.$disconnect().then();
  done();
});

describe("/api/event-types/[id]", () => {
  it("returns a message with the specified events", async () => {
    const { req, res } = createMocks({
      method: "GET",
      query: {
        id: 1,
      },
    });
    prisma.eventType.findUnique({ where: { id: 1 } }).then(async (data: EventType) => {
      await handleEvent(req, res);
      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toStrictEqual({ event: data });
    });
  });
});
