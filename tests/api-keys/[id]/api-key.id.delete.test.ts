import handleDeleteApiKey from "@api/api-keys/[id]/delete";
import { createMocks } from "node-mocks-http";

import prisma from "@calcom/prisma";

describe("DELETE /api/api-keys/[id]/delete with valid id as string returns an apiKey", () => {
  it("returns a message with the specified apiKeys", async () => {
    const apiKey = await prisma.apiKey.findFirst()
    const { req, res } = createMocks({
      method: "DELETE",
      query: {
        id: apiKey?.id,
      },
    });
    // const apiKey = await prisma.apiKey.findUnique({ where: { id: req.query.id} });
    await handleDeleteApiKey(req, res);
    expect(res._getStatusCode()).toBe(204);
    expect(JSON.parse(res._getData())).toEqual({message: `api-key with id: ${apiKey?.id} deleted successfully`});
  });
});

// This can never happen under our normal nextjs setup where query is always a string | string[].
// But seemed a good example for testing an error validation
describe("DELETE /api/api-keys/[id]/delete errors if query id is number, requires a string", () => {
  it("returns a message with the specified apiKeys", async () => {
    const { req, res } = createMocks({
      method: "DELETE",
      query: {
        id: 1, // passing query as a number, which should fail as nextjs will try to parse it as a string
      },
    });
    await handleDeleteApiKey(req, res);

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

describe("DELETE /api/api-keys/[id]/delete an id not present in db like 0, throws 404 not found", () => {
  it("returns a message with the specified apiKeys", async () => {
    const { req, res } = createMocks({
      method: "DELETE",
      query: {
        id: "0", // There's no apiKey  with id 0
      },
    });
    await handleDeleteApiKey(req, res);

    expect(res._getStatusCode()).toBe(404);
    expect(JSON.parse(res._getData())).toStrictEqual({
      "error": {
     "clientVersion": "3.10.0",
     "code": "P2025",
     "meta": {
       "cause": "Record to delete does not exist.",
     },
   },
   "message": "Resource with id:0 was not found",
     });
  });
});

describe("POST /api/api-keys/[id]/delete fails, only DELETE allowed", () => {
  it("returns a message with the specified apiKeys", async () => {
    const { req, res } = createMocks({
      method: "POST", // This POST method is not allowed
      query: {
        id: "1",
      },
    });
    await handleDeleteApiKey(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toStrictEqual({ message: "Only DELETE Method allowed" });
  });
});


