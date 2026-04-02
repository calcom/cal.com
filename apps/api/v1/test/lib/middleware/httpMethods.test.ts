import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { httpMethod } from "../../../lib/helpers/httpMethods";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

afterEach(() => {
  vi.resetAllMocks();
});

describe("HTTP Methods function only allows the correct HTTP Methods", () => {
  it("Should allow the passed in Method", async () => {
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {},
    });

    const middleware = {
      fn: httpMethod("POST"),
    };

    const serverNext = vi.fn((next: void) => Promise.resolve(next));

    const middlewareSpy = vi.spyOn(middleware, "fn");

    await middleware.fn(req, res, serverNext);

    expect(middlewareSpy).toBeCalled();
    expect(res.statusCode).toBe(200);
  });
  it("Should allow the passed in Method", async () => {
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {},
    });

    const middleware = {
      fn: httpMethod("GET"),
    };

    const serverNext = vi.fn((next: void) => Promise.resolve(next));
    const middlewareSpy = vi.spyOn(middleware, "fn");

    await middleware.fn(req, res, serverNext);

    expect(middlewareSpy).toBeCalled();
    expect(res.statusCode).toBe(405);
  });
});
