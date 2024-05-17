import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, expect, it } from "vitest";

import prisma from "@calcom/prisma";

import handler from "../../../pages/api/bookings/_get";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

describe("GET /api/bookings", () => {
  it("Returns 403 when user has no permission to the bookings of another user", async () => {
    const memberUser = await prisma.user.findFirstOrThrow({ where: { email: "member2-acme@example.com" } });
    const proUser = await prisma.user.findFirstOrThrow({ where: { email: "pro@example.com" } });

    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      query: {
        userId: proUser.id,
      },
    });

    req.userId = memberUser.id;

    const responseData = await handler(req);
    expect(responseData).toBeUndefined();
  });

  it("Returns bookings for regular user", async () => {
    const proUser = await prisma.user.findFirstOrThrow({ where: { email: "pro@example.com" } });
    const booking = await prisma.booking.findFirstOrThrow({ where: { userId: proUser.id } });

    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
    });

    req.userId = proUser.id;

    const responseData = await handler(req);
    console.log("----------------------", responseData);
    expect(responseData.bookings.length).toBe(1);
  });
});
