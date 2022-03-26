import handleNewApiKey from "@api/api-keys/new";
import { createMocks } from "node-mocks-http";

import prisma from "@calcom/prisma";
// import {stringifyISODate} from "@lib/utils/stringifyISODate";

// describe("PATCH /api/api-keys/[id]/edit with valid id and body with note", () => {
//   it("returns a 200 and the updated apiKey note", async () => {
//     const { req, res } = createMocks({
//       method: "PATCH",
//       query: {
//         id: "cl16zg6860000wwylnsgva00b",
//       },
//       body: {
//         note: "Updated note",
//       },
//     });
//     const apiKey = await prisma.apiKey.findUnique({ where: { id: req.query.id } });
//     await handleNewApiKey(req, res);

//     expect(res._getStatusCode()).toBe(200);
//     expect(JSON.parse(res._getData())).toEqual({ data: {...apiKey, createdAt: stringifyISODate(apiKey?.createdAt), expiresAt: stringifyISODate(apiKey?.expiresAt)} });
//   });
// });

// // describe("PATCH /api/api-keys/[id]/edit with invalid id returns 404", () => {
// //   it("returns a message with the specified apiKeys", async () => {
// //     const { req, res } = createMocks({
// //       method: "PATCH",
// //       query: {
// //         id: "cl16zg6860000wwylnsgva00a",
// //       },
// //       body: {
// //         note: "Updated note",
// //       },
// //     });
// //     const apiKey = await prisma.apiKey.findUnique({ where: { id: req.query.id } });
// //     await handleNewApiKey(req, res);

// //     expect(res._getStatusCode()).toBe(404);
// //     if (apiKey) apiKey.note = "Updated note";
// //     expect(JSON.parse(res._getData())).toStrictEqual({       "error":  {
// //         "clientVersion": "3.10.0",
// //         "code": "P2025",
// //         "meta":  {
// //           "cause": "Record to update not found.",
// //           },
// //       },
// //       "message": "apiKey with ID cl16zg6860000wwylnsgva00a not found and wasn't updated", });
// //   });
// // });

// describe("PATCH /api/api-keys/[id]/edit with valid id and no body returns 200 with an apiKey with no note and default expireAt", () => {
//   it("returns a message with the specified apiKeys", async () => {
//     const apiKey = await prisma.apiKey.create({data:{} });
//     const { req, res } = createMocks({
//       method: "PATCH",
//       query: {
//         id: apiKey?.id,
//       },
//     });
//     await handleNewApiKey(req, res);

//     expect(apiKey?.note).toBeNull();
//     expect(res._getStatusCode()).toBe(200);
//     expect(JSON.parse(res._getData())).toEqual({ data: {...apiKey, createdAt: stringifyISODate(apiKey?.createdAt), expiresAt: stringifyISODate(apiKey?.expiresAt)} });
  
//   });
// });

describe("POST /api/api-keys/new with a note", () => {
  it("returns a 201, and the created api key", async () => {
    const { req, res } = createMocks({
      method: "POST", // This POST method is not allowed
      body: {
        note: "Updated note",
      },
    });
    await handleNewApiKey(req, res);

    expect(res._getStatusCode()).toBe(201);
    expect(JSON.parse(res._getData()).data.note).toStrictEqual("Updated note");
  });
});


describe("POST /api/api-keys/new with a slug param", () => {
  it("returns error 400, and the details about invalid slug body param", async () => {
    const { req, res } = createMocks({
      method: "POST", // This POST method is not allowed
      body: {
        note: "Updated note",
        slug: "slug",
      },
    });
    await handleNewApiKey(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toStrictEqual(
 [{"code": "unrecognized_keys", "keys": ["slug"], "message": "Unrecognized key(s) in object: 'slug'", "path": []}]
    );
  });
});


describe("GET /api/api-keys/new fails, only POST allowed", () => {
  it("returns a message with the specified apiKeys", async () => {
    const { req, res } = createMocks({
      method: "GET", // This POST method is not allowed
    });
    await handleNewApiKey(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toStrictEqual({ error: "Only POST Method allowed" });
  });
});

describe("GET /api/api-keys/new fails, only POST allowed", () => {
  it("returns a message with the specified apiKeys", async () => {
    const { req, res } = createMocks({
      method: "POST", // This POST method is not allowed
      body: {
        fail: true
        // note: '123',
        // slug: 12,
      },
    });
    await handleNewApiKey(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toStrictEqual({ error: "Only POST Method allowed" });
  });
});