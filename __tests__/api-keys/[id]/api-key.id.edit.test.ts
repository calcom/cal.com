import handleapiKeyEdit from "@api/api-keys/[id]/edit";
import { createMocks } from "node-mocks-http";

import prisma from "@calcom/prisma";
import {stringifyISODate} from "@lib/utils/stringifyISODate";

describe("PATCH /api/api-keys/[id]/edit with valid id and body with note", () => {
  it("returns a 200 and the updated apiKey note", async () => {
    const { req, res } = createMocks({
      method: "PATCH",
      query: {
        id: "cl16zg6860000wwylnsgva00b",
      },
      body: {
        note: "Updated note",
      },
    });
    const apiKey = await prisma.apiKey.findUnique({ where: { id: req.query.id } });
    await handleapiKeyEdit(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({ data: {...apiKey, createdAt: stringifyISODate(apiKey?.createdAt), expiresAt: stringifyISODate(apiKey?.expiresAt)} });
  });
});

// describe("PATCH /api/api-keys/[id]/edit with invalid id returns 404", () => {
//   it("returns a message with the specified apiKeys", async () => {
//     const { req, res } = createMocks({
//       method: "PATCH",
//       query: {
//         id: "cl16zg6860000wwylnsgva00a",
//       },
//       body: {
//         note: "Updated note",
//       },
//     });
//     const apiKey = await prisma.apiKey.findUnique({ where: { id: req.query.id } });
//     await handleapiKeyEdit(req, res);

//     expect(res._getStatusCode()).toBe(404);
//     if (apiKey) apiKey.note = "Updated note";
//     expect(JSON.parse(res._getData())).toStrictEqual({       "error":  {
//         "clientVersion": "3.10.0",
//         "code": "P2025",
//         "meta":  {
//           "cause": "Record to update not found.",
//           },
//       },
//       "message": "apiKey with ID cl16zg6860000wwylnsgva00a not found and wasn't updated", });
//   });
// });

describe("PATCH /api/api-keys/[id]/edit with valid id and no body returns 200 with an apiKey with no note and default expireAt", () => {
  it("returns a message with the specified apiKeys", async () => {
    const apiKey = await prisma.apiKey.create({data:{} });
    const { req, res } = createMocks({
      method: "PATCH",
      query: {
        id: apiKey?.id,
      },
    });
    await handleapiKeyEdit(req, res);

    expect(apiKey?.note).toBeNull();
    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({ data: {...apiKey, createdAt: stringifyISODate(apiKey?.createdAt), expiresAt: stringifyISODate(apiKey?.expiresAt)} });
  
  });
});

describe("POST /api/api-keys/[id]/edit fails, only PATCH allowed", () => {
  it("returns a message with the specified apiKeys", async () => {
    const { req, res } = createMocks({
      method: "POST", // This POST method is not allowed
      query: {
        id: "cl16zg6860000wwylnsgva00b",
      },
      body: {
        note: "Updated note",
      },
    });
    await handleapiKeyEdit(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toStrictEqual({ message: "Only PATCH Method allowed for updating API keys" });
  });
});


