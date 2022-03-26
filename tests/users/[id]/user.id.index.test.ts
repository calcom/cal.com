import handleUser from "@api/users/[id]";
import { createMocks } from "node-mocks-http";

import prisma from "@calcom/prisma";
import { stringifyISODate } from "@lib/utils/stringifyISODate";

describe("GET /api/users/[id] with valid id as string returns an user-type", () => {
  it("returns a message with the specified events", async () => {
    const { req, res } = createMocks({
      method: "GET",
      query: {
        id: "1",
      },
    });
    const user = await prisma.user.findUnique({ where: { id: 1 } });
    await handleUser(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({ data: {...user, createdDate: stringifyISODate(user?.createdDate), emailVerified: stringifyISODate(user?.emailVerified)} });
  });
});

// This can never happen under our normal nextjs setup where query is always a string | string[].
// But seemed a good example for testing an error validation
describe("GET /api/users/[id] errors if query id is number, requires a string", () => {
  it("returns a message with the specified events", async () => {
    const { req, res } = createMocks({
      method: "GET",
      query: {
        id: 1, // passing query as a number, which should fail as nextjs will try to parse it as a string
      },
    });
    await handleUser(req, res);

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

describe("GET /api/users/[id] an id not present in db like 0, throws 404 not found", () => {
  it("returns a message with the specified events", async () => {
    const { req, res } = createMocks({
      method: "GET",
      query: {
        id: "0", // There's no user type with id 0
      },
    });
    await handleUser(req, res);

    expect(res._getStatusCode()).toBe(404);
    expect(JSON.parse(res._getData())).toStrictEqual({ message: "Event type not found" });
  });
});

describe("POST /api/users/[id] fails, only GET allowed", () => {
  it("returns a message with the specified events", async () => {
    const { req, res } = createMocks({
      method: "POST", // This POST method is not allowed
      query: {
        id: "1",
      },
    });
    await handleUser(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toStrictEqual({ message: "Only GET Method allowed" });
  });
});


