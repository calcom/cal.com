import {
  createBookingScenario,
  getScenarioData,
  TestData,
  getDate,
  getMockBookingAttendee,
  getOrganizer,
  getBooker,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import { expectWebhookToHaveBeenCalledWith } from "@calcom/web/test/utils/bookingScenario/expects";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, afterEach, test, vi, beforeEach, beforeAll } from "vitest";

import { appStoreMetadata } from "@calcom/app-store/apps.metadata.generated";
import { getRoomNameFromRecordingId, getBatchProcessorJobAccessLink } from "@calcom/app-store/dailyvideo/lib";
import { WEBAPP_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { BookingStatus } from "@calcom/prisma/enums";
import handler from "@calcom/web/pages/api/recorded-daily-video";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;
beforeAll(() => {
  // Setup env vars
  vi.stubEnv("SENDGRID_API_KEY", "FAKE_SENDGRID_API_KEY");
  vi.stubEnv("SENDGRID_EMAIL", "FAKE_SENDGRID_EMAIL");
});

vi.mock("@calcom/app-store/dailyvideo/lib", () => {
  return {
    getRoomNameFromRecordingId: vi.fn(),
    getBatchProcessorJobAccessLink: vi.fn(),
  };
});

vi.mock("@calcom/lib/videoTokens", () => {
  return {
    generateVideoToken: vi.fn().mockReturnValue("MOCK_TOKEN"),
  };
});

const BATCH_PROCESSOR_JOB_FINSISHED_PAYLOAD = {
  version: "1.1.0",
  type: "batch-processor.job-finished",
  id: "77b1cb9e-cd79-43cd-bad6-3ccaccba26be",
  payload: {
    id: "77b1cb9e-cd79-43cd-bad6-3ccaccba26be",
    status: "finished",
    input: {
      sourceType: "recordingId",
      recordingId: "eb9e84de-783e-4e14-875d-94700ee4b976",
    },
    output: {
      transcription: [
        {
          format: "json",
          s3Config: {
            key: "transcript.json",
            bucket: "daily-bucket",
            region: "us-west-2",
          },
        },
        {
          format: "srt",
          s3Config: {
            key: "transcript.srt",
            bucket: "daily-bucket",
            region: "us-west-2",
          },
        },
        {
          format: "txt",
          s3Config: {
            key: "transcript.txt",
            bucket: "daily-bucket",
            region: "us-west-2",
          },
        },
        {
          format: "vtt",
          s3Config: {
            key: "transcript.vtt",
            bucket: "daily-bucket",
            region: "us-west-2",
          },
        },
      ],
    },
  },
  event_ts: 1717688213.803,
};

const timeout = process.env.CI ? 5000 : 20000;

const TRANSCRIPTION_ACCESS_LINK = {
  id: "MOCK_ID",
  preset: "transcript",
  status: "finished",
  transcription: [
    {
      format: "json",
      link: "https://download.json",
    },
    {
      format: "srt",
      link: "https://download.srt",
    },
  ],
};

describe("Handler: /api/recorded-daily-video", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
    fetchMock.resetMocks();
  });

  test(
    `Batch Processor Job finished triggers RECORDING_TRANSCRIPTION_GENERATED webhooks`,
    async () => {
      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
      });

      const bookingUid = "n5Wv3eHgconAED2j4gcVhP";
      const iCalUID = `${bookingUid}@Cal.com`;
      const subscriberUrl = "http://my-webhook.example.com";

      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      await createBookingScenario(
        getScenarioData({
          webhooks: [
            {
              userId: organizer.id,
              eventTriggers: [WebhookTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED],
              subscriberUrl,
              active: true,
              eventTypeId: 1,
              appId: null,
            },
          ],
          eventTypes: [
            {
              id: 1,
              slotInterval: 15,
              length: 15,
              users: [
                {
                  id: 101,
                },
              ],
            },
          ],
          bookings: [
            {
              uid: bookingUid,
              eventTypeId: 1,
              status: BookingStatus.ACCEPTED,
              startTime: `${plus1DateString}T05:00:00.000Z`,
              endTime: `${plus1DateString}T05:15:00.000Z`,
              userId: organizer.id,
              metadata: {
                videoCallUrl: "https://existing-daily-video-call-url.example.com",
              },
              references: [
                {
                  type: appStoreMetadata.dailyvideo.type,
                  uid: "MOCK_ID",
                  meetingId: "MOCK_ID",
                  meetingPassword: "MOCK_PASS",
                  meetingUrl: "http://mock-dailyvideo.example.com",
                  credentialId: null,
                },
              ],
              attendees: [
                getMockBookingAttendee({
                  id: 2,
                  name: booker.name,
                  email: booker.email,
                  locale: "en",
                  timeZone: "Asia/Kolkata",
                  noShow: false,
                }),
              ],
              iCalUID,
            },
          ],
          organizer,
          apps: [TestData.apps["daily-video"]],
        })
      );

      vi.mocked(getRoomNameFromRecordingId).mockResolvedValue("MOCK_ID");
      vi.mocked(getBatchProcessorJobAccessLink).mockResolvedValue(TRANSCRIPTION_ACCESS_LINK);

      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: BATCH_PROCESSOR_JOB_FINSISHED_PAYLOAD,
        prisma,
      });

      await handler(req, res);

      await expectWebhookToHaveBeenCalledWith(subscriberUrl, {
        triggerEvent: WebhookTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED,
        payload: {
          type: "Test Booking Title",
          uid: bookingUid,
          downloadLinks: {
            transcription: TRANSCRIPTION_ACCESS_LINK.transcription,
            recording: `${WEBAPP_URL}/api/video/recording?token=MOCK_TOKEN`,
          },
          organizer: {
            email: organizer.email,
            name: organizer.name,
            timeZone: organizer.timeZone,
            language: { locale: "en" },
            utcOffset: 330,
          },
        },
      });
    },
    timeout
  );
});
