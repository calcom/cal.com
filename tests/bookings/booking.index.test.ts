import handleApiKeys from "@api/api-keys";
import { createMocks } from "node-mocks-http";

import prisma from "@calcom/prisma";

import { stringifyISODate } from "@lib/utils/stringifyISODate";

describe("GET /api/api-keys without any params", () => {
  it("returns a message with the specified apiKeys", async () => {
    const { req, res } = createMocks({
      method: "GET",
      query: {},
    });
    let apiKeys = await prisma.apiKey.findMany();
    await handleApiKeys(req, res);

    expect(res._getStatusCode()).toBe(200);
    apiKeys = apiKeys.map(
      (apiKey) =>
        (apiKey = {
          ...apiKey,
          createdAt: stringifyISODate(apiKey?.createdAt),
          expiresAt: stringifyISODate(apiKey?.expiresAt),
        })
    );
    expect(JSON.parse(res._getData())).toStrictEqual(JSON.parse(JSON.stringify({ data: { ...apiKeys } })));
  });
});

describe("POST /api/api-keys/ fails, only GET allowed", () => {
  it("returns a message with the specified apiKeys", async () => {
    const { req, res } = createMocks({
      method: "POST", // This POST method is not allowed
    });
    await handleApiKeys(req, res);
    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toStrictEqual({ message: "Only GET Method allowed" });
  });
});
