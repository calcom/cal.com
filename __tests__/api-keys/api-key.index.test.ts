import handleApiKeys from "@api/api-keys";
import { createMocks } from "node-mocks-http";

import prisma from "@calcom/prisma";
import {stringifyISODate} from "@lib/utils/stringifyISODate";

describe("GET /api/api-keys without any params", () => {
  it("returns a message with the specified apiKeys", async () => {
    const { req, res } = createMocks({
      method: "GET",
      query: {},
    });
    let apiKeys = await prisma.apiKey.findMany();
    await handleApiKeys(req, res);

    expect(res._getStatusCode()).toBe(200);
    apiKeys = apiKeys.map(apiKey => (apiKey = {...apiKey, createdAt: stringifyISODate(apiKey?.createdAt), expiresAt: stringifyISODate(apiKey?.expiresAt)}));
    expect(JSON.parse(res._getData())).toStrictEqual(JSON.parse(JSON.stringify({ data: {...apiKeys} })));
  });
});

// This can never happen under our normal nextjs setup where query is always a string | string[].
// But seemed a good example for testing an error validation
// describe("GET /api/api-keys/[id] errors if query id is number, requires a string", () => {
//   it("returns a message with the specified apiKeys", async () => {
//     const { req, res } = createMocks({
//       method: "GET",
//       query: {
//         id: 1, // passing query as a number, which should fail as nextjs will try to parse it as a string
//       },
//     });
//     await handleApiKeys(req, res);

//     expect(res._getStatusCode()).toBe(400);
//     expect(JSON.parse(res._getData())).toStrictEqual([
//       {
//         code: "invalid_type",
//         expected: "string",
//         received: "number",
//         path: ["id"],
//         message: "Expected string, received number",
//       },
//     ]);
//   });
// });

// describe("GET /api/api-keys/[id] an id not present in db like 0, throws 404 not found", () => {
//   it("returns a message with the specified apiKeys", async () => {
//     const { req, res } = createMocks({
//       method: "GET",
//       query: {
//         id: "0", // There's no apiKey  with id 0
//       },
//     });
//     await handleApiKey(req, res);

//     expect(res._getStatusCode()).toBe(404);
//     expect(JSON.parse(res._getData())).toStrictEqual({ message: "API key was not found" });
//   });
// });

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

// describe("GET /api/api-keys/ without prisma", () => {
//   it("returns a message with the specified apiKeys", async () => {
//       prisma.$disconnect().then();

//     const { req, res } = createMocks({
//       method: "GET",
//     });
//     await handleApiKeys(req, res);

//     expect(res._getStatusCode()).toBe(400);
//     expect(JSON.parse(res._getData())).toStrictEqual({ message: "API key was not found" });
//   });
// });


