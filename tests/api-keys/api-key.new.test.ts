import handleNewApiKey from "@api/api-keys/new";
import { createMocks } from "node-mocks-http";

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
    expect(JSON.parse(res._getData())).toStrictEqual([
      {
        code: "unrecognized_keys",
        keys: ["slug"],
        message: "Unrecognized key(s) in object: 'slug'",
        path: [],
      },
    ]);
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

// FIXME: test 405 when prisma fails look for how to test prisma errors
describe("GET /api/api-keys/new fails, only POST allowed", () => {
  it("returns a message with the specified apiKeys", async () => {
    const { req, res } = createMocks({
      method: "POST", // This POST method is not allowed
      body: {
        nonExistentParam: true,
        // note: '123',
        // slug: 12,
      },
    });
    await handleNewApiKey(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toStrictEqual([
      {
        code: "unrecognized_keys",
        keys: ["nonExistentParam"],
        message: "Unrecognized key(s) in object: 'nonExistentParam'",
        path: [],
      },
    ]);
  });
});
