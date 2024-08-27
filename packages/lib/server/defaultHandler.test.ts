import { createMocks } from "node-mocks-http";
import { describe, it, expect, vi, afterEach } from "vitest";

import { defaultHandler } from "./defaultHandler";

describe("defaultHandler Test Suite", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return 405 for unsupported HTTP methods", async () => {
    const handlers = {};
    const handler = defaultHandler(handlers);

    const { req, res } = createMocks({
      method: "PATCH", // Unsupported method here
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(res._getJSONData()).toEqual({
      message: "Method Not Allowed (Allow: )",
    });
  });

  it("should call the correct handler for a supported method", async () => {
    const getHandler = vi.fn().mockResolvedValue(null);
    const handlers = {
      GET: { default: getHandler },
    };
    const handler = defaultHandler(handlers);

    const { req, res } = createMocks({
      method: "GET",
    });

    await handler(req, res);

    expect(getHandler).toHaveBeenCalledWith(req, res);
  });

  it("should return 500 for errors thrown in handler", async () => {
    const getHandler = vi.fn().mockRejectedValue(new Error("Test Error"));
    const handlers = {
      GET: { default: getHandler },
    };
    const handler = defaultHandler(handlers);

    const { req, res } = createMocks({
      method: "GET",
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(res._getJSONData()).toEqual({
      message: "Something went wrong",
    });
  });
});
