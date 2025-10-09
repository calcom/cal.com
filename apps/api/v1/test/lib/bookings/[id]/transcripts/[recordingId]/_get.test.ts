import prismaMock from "../../../../../../../../../tests/libs/__mocks__/prismaMock";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, expect, test, vi, afterEach } from "vitest";

import {
  getTranscriptsAccessLinkFromRecordingId,
  checkIfRoomNameMatchesInRecording,
} from "@calcom/features/conferencing/lib/videoClient";
import { buildBooking } from "@calcom/lib/test/builder";

import { getAccessibleUsers } from "~/lib/utils/retrieveScopedAccessibleUsers";

import authMiddleware from "../../../../../../pages/api/bookings/[id]/_auth-middleware";
import handler from "../../../../../../pages/api/bookings/[id]/transcripts/[recordingId]/_get";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

vi.mock("@calcom/features/conferencing/lib/videoClient", () => {
  return {
    getTranscriptsAccessLinkFromRecordingId: vi.fn(),
    checkIfRoomNameMatchesInRecording: vi.fn(),
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

const mockGetTranscripts = () => {
  const downloadLinks = [{ format: "json", link: "https://URL1" }];

  vi.mocked(getTranscriptsAccessLinkFromRecordingId).mockResolvedValue(downloadLinks);
  vi.mocked(checkIfRoomNameMatchesInRecording).mockResolvedValue(true);

  return downloadLinks;
};

const recordingId = "abc-xyz";

describe("GET /api/bookings/[id]/transcripts/[recordingId]", () => {
  test("Returns transcripts if user is system-wide admin", async () => {
    const adminUserId = 1;
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

    const mockedTranscripts = mockGetTranscripts();
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      body: {},
      query: {
        id: bookingId,
        recordingId,
      },
    });

    req.isSystemWideAdmin = true;
    req.userId = adminUserId;

    await authMiddleware(req);
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res._getData())).toEqual(mockedTranscripts);
  });

  test("Allows GET transcripts when user is org-wide admin", async () => {
    const adminUserId = 1;
    const memberUserId = 10;
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
        recordingId,
      },
    });

    req.userId = adminUserId;
    req.isOrganizationOwnerOrAdmin = true;
    mockGetTranscripts();

    vi.mocked(getAccessibleUsers).mockResolvedValue([memberUserId]);

    await authMiddleware(req);
    await handler(req, res);

    expect(res.statusCode).toBe(200);
  });
});
