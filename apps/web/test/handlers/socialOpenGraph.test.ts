import type { Request, Response } from "express";
import type { NextApiResponse, NextApiRequest } from "next";
import { createMocks } from "node-mocks-http";
import { describe, it, expect } from "vitest";

import { WEBAPP_URL } from "@calcom/lib/constants";

import handler from "../../pages/api/social/og/image";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

describe("GET /api/social/og/image", () => {
  it("should return a meeting image for 1 user", async () => {
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      url: "/api/social/og/image",
      query: {
        type: "meeting",
        title: "super long event title for testing purposes",
        meetingProfileName: "Pro Example",
        meetingImage: `${WEBAPP_URL}/pro/avatar.png`,
        names: ["Pro Example"],
        usernames: ["pro"],
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getHeaders()["content-type"]).toContain("image/png");

    const imageBuffer = res._getData();
    expect(imageBuffer.length).toBeGreaterThan(0);
  });

  it("should return a meeting image for a team event with multiple people", async () => {
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      url: "/api/social/og/image",
      query: {
        type: "meeting",
        title: "Getting to know us and have a beer together",
        meetingProfileName: "Seeded Team",
        names: [
          "Team Pro Example 2",
          "Team Pro Example 3",
          "Team Pro Example 4",
          "Team Free Example",
          "Team Pro Example",
        ],
        usernames: ["teampro2", "teampro3", "teampro4", "teamfree", "teampro"],
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getHeaders()["content-type"]).toContain("image/png");

    const imageBuffer = res._getData();
    expect(imageBuffer.length).toBeGreaterThan(0);
  });

  it("should return a meeting image for a team event of 2 people", async () => {
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      url: "/api/social/og/image",
      query: {
        type: "meeting",
        title: "Getting to know each other",
        meetingProfileName: "Seeded Team",
        names: ["Team Pro Example 2", "Team Pro Example 3"],
        usernames: ["teampro2", "teampro3"],
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getHeaders()["content-type"]).toContain("image/png");

    const imageBuffer = res._getData();
    expect(imageBuffer.length).toBeGreaterThan(0);
  });

  it.only("should return a meeting image for a round robin event", async () => {
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      url: "/api/social/og/image",
      query: {
        type: "meeting",
        title: "Round Robin Seeded Team Event",
        meetingProfileName: "Seeded Team",
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getHeaders()["content-type"]).toContain("image/png");

    const imageBuffer = res._getData();
    expect(imageBuffer.length).toBeGreaterThan(0);
  });

  it("should return a meeting image for a dynamic collective (2 persons)", async () => {
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      url: "/api/social/og/image",
      query: {
        type: "meeting",
        title: "15min",
        meetingProfileName: "Team Pro Example, Pro Example",
        names: ["Team Pro Example", "Pro Example"],
        usernames: ["teampro", "pro"],
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getHeaders()["content-type"]).toContain("image/png");

    const imageBuffer = res._getData();
    expect(imageBuffer.length).toBeGreaterThan(0);
  });
});
