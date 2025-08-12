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

import { NextRequest } from "next/server";
import { createMocks } from "node-mocks-http";
import { describe, afterEach, test, vi, beforeEach, beforeAll, expect } from "vitest";

import { appStoreMetadata } from "@calcom/app-store/apps.metadata.generated";
import { getRoomNameFromRecordingId, getBatchProcessorJobAccessLink } from "@calcom/app-store/dailyvideo/lib";
import { WEBAPP_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { BookingStatus } from "@calcom/prisma/enums";
import * as recordedDailyVideoRoute from "@calcom/web/app/api/recorded-daily-video/route";

// Mock the next/headers module before importing the handler
vi.mock("next/headers", () => ({
  headers: () => new Headers({ "content-type": "application/json" }),
  cookies: () => ({
    get: () => null,
    getAll: () => [],
    has: () => false,
  }),
}));

// Mock NextResponse to handle the response properly
vi.mock("next/server", async () => {
  const actual = (await vi.importActual("next/server")) as any;
  return {
    ...actual,
    NextResponse: {
      json: (data: any, init?: ResponseInit) => {
        return new Response(JSON.stringify(data), {
          ...init,
          headers: {
            ...init?.headers,
            "content-type": "application/json",
          },
        });
      },
      // Add other methods you might need
      redirect: actual.NextResponse.redirect,
      next: actual.NextResponse.next,
      rewrite: actual.NextResponse.rewrite,
    },
  };
});

// Now import the handler after mocking
const { postHandler } = recordedDailyVideoRoute;

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

vi.mock("app/api/defaultResponderForAppDir", () => {
  return {
    defaultResponderForAppDir: vi.fn(),
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

// We may need to make this more globally available. Will move if we need it elsewhere
function createNextRequest(mockReq: ReturnType<typeof createMocks>["req"]): NextRequest {
  // Create a Request object that NextRequest can wrap
  const request = new Request("https://example.com/api/recorded-daily-video", {
    method: mockReq.method,
    headers: new Headers(mockReq.headers as Record<string, string>),
    body: mockReq.body ? JSON.stringify(mockReq.body) : undefined,
  });

  // Create a NextRequest from the Request
  const nextRequest = new NextRequest(request);

  return nextRequest;
}

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

      const { req } = createMocks({
        method: "POST",
        body: BATCH_PROCESSOR_JOB_FINSISHED_PAYLOAD,
        prisma,
      });

      const nextReq = createNextRequest(req);

      // Handle the response differently
      try {
        const response = await postHandler(nextReq);
        // For App Router, we just need to check if the response exists
        expect(response).toBeDefined();
      } catch (error) {
        console.error("Handler error:", error);
        throw error;
      }

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
