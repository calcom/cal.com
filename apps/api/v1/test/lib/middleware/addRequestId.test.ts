import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { addRequestId } from "../../../lib/helpers/addRequestid";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

afterEach(() => {
  vi.resetAllMocks();
});

describe("Adds a request ID", () => {
  it("Should attach a request ID to the request", async () => {
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {},
    });

    const middleware = {
      fn: addRequestId,
    };

    const serverNext = vi.fn((next: void) => Promise.resolve(next));

    const middlewareSpy = vi.spyOn(middleware, "fn");

    await middleware.fn(req, res, serverNext);

    expect(middlewareSpy).toBeCalled();
    expect(res.statusCode).toBe(200);
    expect(res.getHeader("Calcom-Response-ID")).toBeDefined();
  });
});
