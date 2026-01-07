import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, expect, test, vi, afterEach } from "vitest";

import {
  getRecordingsOfCalVideoByRoomName,
  getDownloadLinkOfCalVideoByRecordingId,
} from "@calcom/features/conferencing/lib/videoClient";
import { buildBooking } from "@calcom/lib/test/builder";

import { getAccessibleUsers } from "~/lib/utils/retrieveScopedAccessibleUsers";

import authMiddleware from "../../../../../pages/api/bookings/[id]/_auth-middleware";
import handler from "../../../../../pages/api/bookings/[id]/recordings/_get";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

const adminUserId = 1;
const memberUserId = 10;

vi.mock("@calcom/features/conferencing/lib/videoClient", () => {
  return {
    getRecordingsOfCalVideoByRoomName: vi.fn(),
    getDownloadLinkOfCalVideoByRecordingId: vi.fn(),
  };
});

vi.mock("~/lib/utils/retrieveScopedAccessibleUsers", () => {
  return {
    getAccessibleUsers: vi.fn(),
  };
});

afterEach(() => {
  vi.resetAllMocks();
});

const mockGetRecordingsAndDownloadLink = () => {
  const download_link = "https://URL";
  const recordingItem = {
    id: "TEST_ID",
    room_name: "0n22w24AQ5ZFOtEKX2gX",
    start_ts: 1716215386,
    status: "finished",
    max_participants: 1,
    duration: 11,
    share_token: "TEST_TOKEN",
  };

  vi.mocked(getRecordingsOfCalVideoByRoomName).mockResolvedValue({ data: [recordingItem], total_count: 1 });

  vi.mocked(getDownloadLinkOfCalVideoByRecordingId).mockResolvedValue({
    download_link,
  });

  return [{ ...recordingItem, download_link }];
};

describe("GET /api/bookings/[id]/recordings", () => {
  test("Returns recordings if user is system-wide admin", async () => {
    const userId = 2;

    const bookingId = 1111;

    prismaMock.booking.findUnique.mockResolvedValue(
      buildBooking({
        id: bookingId,
        userId,
        references: [
          {
            id: 1,
            type: "daily_video",
            uid: "17OHkCH53pBa03FhxMbw",
            meetingId: "17OHkCH53pBa03FhxMbw",
            meetingPassword: "password",
            meetingUrl: "https://URL",
          },
        ],
      })
    );

    const mockedRecordings = mockGetRecordingsAndDownloadLink();
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      body: {},
      query: {
        id: bookingId,
      },
    });

    req.isSystemWideAdmin = true;
    req.userId = adminUserId;

    await authMiddleware(req);
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res._getData())).toEqual(mockedRecordings);
  });

  test("Allows GET recordings when user is org-wide admin", async () => {
    const bookingId = 3333;

    prismaMock.booking.findUnique.mockResolvedValue(
      buildBooking({
        id: bookingId,
        userId: memberUserId,
        references: [
          { id: 1, type: "daily_video", uid: "17OHkCH53pBa03FhxMbw", meetingId: "17OHkCH53pBa03FhxMbw" },
        ],
      })
    );

    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      body: {},
      query: {
        id: bookingId,
      },
    });

    req.userId = adminUserId;
    req.isOrganizationOwnerOrAdmin = true;
    const mockedRecordings = mockGetRecordingsAndDownloadLink();
    vi.mocked(getAccessibleUsers).mockResolvedValue([memberUserId]);

    await authMiddleware(req);
    await handler(req, res);

    expect(res.statusCode).toBe(200);
  });
});
