import { server } from "./__mocks__/server/server";
import { mockCredential } from "@calcom/prisma/__mocks__/mockCredential";

import type { TFunction } from "next-i18next";
import { createMocks } from "node-mocks-http";
import { test, expect, describe, beforeAll, afterAll, afterEach, vi, beforeEach } from "vitest";

import dayjs from "@calcom/dayjs";
import { default as handleNewBooking } from "@calcom/features/bookings/lib/handleNewBooking";
import { buildCalendarEvent } from "@calcom/lib/test/builder";
import { expectFunctionToBeCalledNthTimesWithArgs } from "@calcom/lib/test/expectFunctionToBeCalledNthTimesWithArgs";
import type { CustomNextApiRequest, CustomNextApiResponse } from "@calcom/lib/test/types";
import prisma from "@calcom/prisma";
import { default as prismaMock } from "@calcom/prisma/__mocks__";

import { default as addHandler } from "../api/add";
import { default as callbackHandler } from "../api/callback";
import { default as CalendarService } from "../lib/CalendarService";

vi.mock("@calcom/lib/getIP", () => ({
  _esModule: true,
  default: vi.fn().mockReturnValue("127.0.0.1"),
}));
const mockT: TFunction = vi.fn();
vi.mock("");

export const testExpiryDate = Date.now();

describe("Google oauth endpoints", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  beforeAll(() => server.listen());
  afterAll(() => server.close());
  afterEach(() => server.resetHandlers());

  describe("Google calendar oauth flows", () => {
    test("OAuth URL should contain the correct scopes", async () => {
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
      });

      prismaMock.app.findUnique.mockResolvedValueOnce({
        slug: "google-calendar",
        keys: { client_id: "client_id", client_secret: "client_secret" },
        dirName: "googlecalendar",
        categories: ["calendar"],
        createdAt: new Date(),
        updatedAt: new Date(),
        enabled: true,
      });

      await addHandler(req, res);
      const responseJSON = JSON.parse(res._getData());
      const authURL = responseJSON.url;
      expect(authURL).toEqual(expect.stringContaining("access_type=offline"));
      expect(authURL).toContain("https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.readonly");
      expect(authURL).toContain("https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.events");
    });
    test("OAuth callback should create the correct credentials", async () => {
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          code: "testcode",
        },
        session: {
          user: {
            id: 123,
          },
        },
      });

      prismaMock.app.findUnique.mockResolvedValueOnce({
        slug: "google-calendar",
        keys: { client_id: "client_id", client_secret: "client_secret" },
        dirName: "googlecalendar",
        categories: ["calendar"],
        createdAt: new Date(),
        updatedAt: new Date(),
        enabled: true,
      });

      await callbackHandler(req, res);

      expectFunctionToBeCalledNthTimesWithArgs(
        prismaMock.credential.create,
        1,
        expect.objectContaining({
          data: {
            type: "google_calendar",
            key: {
              scope:
                "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events",
              token_type: "Bearer",
              access_token: "access_token",
              refresh_token: "refresh_token",
              expiry_date: testExpiryDate,
            },
            userId: req.session?.user.id,
            appId: "google-calendar",
          },
        })
      );

      expect(res._getStatusCode()).toBe(302);
    });
  });
  test("Oauth callback should create Google Meet credentials if installGoogleVideo is true", async () => {
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      query: {
        code: "testcode",
        state: JSON.stringify({ installGoogleVideo: true }),
      },
      session: {
        user: {
          id: 123,
        },
      },
    });

    prismaMock.app.findUnique.mockResolvedValueOnce({
      slug: "google-calendar",
      keys: { client_id: "client_id", client_secret: "client_secret" },
      dirName: "googlecalendar",
      categories: ["calendar"],
      createdAt: new Date(),
      updatedAt: new Date(),
      enabled: true,
    });

    await callbackHandler(req, res);

    expect(prismaMock.credential.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: {
          type: "google_calendar",
          key: {
            scope:
              "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events",
            token_type: "Bearer",
            access_token: "access_token",
            refresh_token: "refresh_token",
            expiry_date: testExpiryDate,
          },
          userId: req.session?.user.id,
          appId: "google-calendar",
        },
      })
    );

    expect(prismaMock.credential.create).toHaveBeenNthCalledWith(2, {
      data: {
        type: "google_video",
        key: {},
        userId: req.session?.user.id,
        appId: "google-meet",
      },
    });
  });
  describe("handle sending data to Google", () => {
    test("Create event", async () => {
      const credential = mockCredential({
        type: "google_calendar",
        key: {
          scope:
            "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events",
          token_type: "Bearer",
          access_token: "access_token",
          refresh_token: "refresh_token",
          expiry_date: testExpiryDate + 60 * 60 * 1000,
        },
        userId: 123,
        appId: "google-calendar",
      });

      const calendarEventRaw = buildCalendarEvent({
        attendees: [
          {
            name: "test",
            email: "test@test.com",
            timeZone: "America/Montevideo",
            language: { translate: mockT, locale: "en" },
          },
        ],
      });
      console.log("🚀 ~ file: gcal.test.ts:188 ~ test ~ calendarEventRaw:", calendarEventRaw);

      const googleCalendarService = new CalendarService(credential);
      const response = await googleCalendarService.createEvent(calendarEventRaw, credential.id);
      console.log("🚀 ~ file: gcal.test.ts:187 ~ test ~ response:", response);

      expect(response).toEqual(
        expect.objectContaining({
          uid: "",
          id: "12345",
          kind: "calendar#event",
          etag: "12345",
          iCalUID: calendarEventRaw.iCalUID,
          type: "google_calendar",
          password: "",
          url: "",
          summary: calendarEventRaw.title,
          status: "confirmed",
          reminders: { useDefault: true },
          location: calendarEventRaw.location,
          organizer: {
            email: calendarEventRaw.organizer.email,
            displayName: calendarEventRaw.organizer.name,
            self: true,
          },
          additionalInfo: { hangoutLink: "" },
          start: {
            dateTime: calendarEventRaw.startTime,
            timeZone: calendarEventRaw.organizer.timeZone,
          },
          end: {
            dateTime: calendarEventRaw.endTime,
            timeZone: calendarEventRaw.organizer.timeZone,
          },
          attendees: calendarEventRaw.attendees.map((attendee) => ({
            email: attendee.email,
          })),
        })
      );
    });
    test("API call to handleNewBooking", async () => {
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: {
          name: "test",
          start: dayjs().add(1, "hour").format(),
          end: dayjs().add(1, "day").format(),
          eventTypeId: 3,
          email: "test@example.com",
          location: "Cal.com Video",
          timeZone: "America/Montevideo",
          language: "en",
          customInputs: [],
          metadata: {},
          userId: 4,
        },
        userId: 4,
        prisma,
      });

      // prismaMock.eventType.findUniqueOrThrow.mockResolvedValue(buildEventType());
      // prismaMock.booking.findMany.mockResolvedValue([]);

      await handleNewBooking(req, res);
      console.log({ statusCode: res._getStatusCode(), data: JSON.parse(res._getData()) });

      expect(prismaMock.booking.create).toHaveBeenCalledTimes(1);
    });
  });
});
