import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, expect, it } from "vitest";

import prisma from "@calcom/prisma";

import { handler } from "../../../pages/api/bookings/_get";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

const DefaultPagination = {
  take: 10,
  skip: 0,
};

describe("GET /api/bookings", () => {
  it("Returns 403 when user has no permission to the bookings of another user", async () => {
    const memberUser = await prisma.user.findFirstOrThrow({ where: { email: "member2-acme@example.com" } });
    const proUser = await prisma.user.findFirstOrThrow({ where: { email: "pro@example.com" } });

    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      query: {
        userId: proUser.id,
      },
      pagination: DefaultPagination,
    });

    req.userId = memberUser.id;

    const responseData = await handler(req);
    expect(responseData.bookings.length).toBe(0);
  });

  it("Returns bookings for regular user", async () => {
    const proUser = await prisma.user.findFirstOrThrow({ where: { email: "pro@example.com" } });
    const booking = await prisma.booking.findFirstOrThrow({ where: { userId: proUser.id } });

    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      pagination: DefaultPagination,
    });

    req.userId = proUser.id;

    const responseData = await handler(req);
    expect(responseData.bookings.find((b) => b.id === booking.id)).toBeDefined();
    expect(responseData.bookings.find((b) => b.userId !== proUser.id)).toBeUndefined();
  });
});
