import handleTeamEdit from "@api/teams/[id]/edit";
import { createMocks } from "node-mocks-http";

import prisma from "@calcom/prisma";

describe("PATCH /api/teams/[id]/edit with valid id and body updates a team", () => {
  it("returns a message with the specified teams", async () => {
    const { req, res } = createMocks({
      method: "PATCH",
      query: {
        id: "1",
      },
      body: {
        name: "Updated team",
        slug: "updated-team",
      },
    });
    const team = await prisma.team.findUnique({ where: { id: parseInt(req.query.id) } });
    await handleTeamEdit(req, res);

    expect(res._getStatusCode()).toBe(200);
    // if (team) team.name = "Updated name";
    expect(JSON.parse(res._getData())).toStrictEqual({ data: team });
  });
});

describe("PATCH /api/teams/[id]/edit with invalid id returns 404", () => {
  it("returns a message with the specified teams", async () => {
    const { req, res } = createMocks({
      method: "PATCH",
      query: {
        id: "0",
      },
      body: {
        name: "Updated name",
        slug: "updated-slug",
      },
    });
    const team = await prisma.team.findUnique({ where: { id: parseInt(req.query.id) } });
    await handleTeamEdit(req, res);

    expect(res._getStatusCode()).toBe(404);
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

describe("PATCH /api/teams/[id]/edit with valid id and no body returns 400 error and zod validation errors", () => {
  it("returns a message with the specified teams", async () => {
    const { req, res } = createMocks({
      method: "PATCH",
      query: {
        id: "2",
      },
    });
    await handleTeamEdit(req, res);

    expect(res._getStatusCode()).toBe(400);

    // Ugly parsing of zod validation errors, not for final production but works for testing
    expect(JSON.parse(res._getData())).toStrictEqual([
      {
        code: "invalid_type",
        expected: "string",
        message: "Required",
        path: ["slug"],
        received: "undefined",
      },
      {
        code: "invalid_type",
        expected: "string",
        message: "Required",
        path: ["name"],
        received: "undefined",
      },
    ]);
  });
});

describe("POST /api/teams/[id]/edit fails, only PATCH allowed", () => {
  it("returns a message with the specified teams", async () => {
    const { req, res } = createMocks({
      method: "POST", // This POST method is not allowed
      query: {
        id: "1",
      },
      body: {
        name: "Updated name",
        slug: "updated-slug",
      },
    });
    await handleTeamEdit(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toStrictEqual({
      message: "Only PATCH Method allowed for updating teams",
    });
  });
});
