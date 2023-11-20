import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { describe } from "vitest";

import { SchedulingType } from "@calcom/prisma/enums";
import { BookingStatus } from "@calcom/prisma/enums";
import type { TRequestRescheduleInputSchema } from "@calcom/trpc/server/routers/viewer/bookings/requestReschedule.schema";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import { test } from "@calcom/web/test/fixtures/fixtures";
import {
  createBookingScenario,
  getGoogleCalendarCredential,
  TestData,
  getOrganizer,
  getBooker,
  getScenarioData,
  getMockBookingAttendee,
  getDate,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import { expectBookingRequestRescheduledEmails } from "@calcom/web/test/utils/bookingScenario/expects";

import { getSampleUserInSession } from "../utils/bookingScenario/getSampleUserInSession";
import { setupAndTeardown } from "../utils/bookingScenario/setupAndTeardown";

export type CustomNextApiRequest = NextApiRequest & Request;

export type CustomNextApiResponse = NextApiResponse & Response;

describe("Handler: requestReschedule", () => {
  setupAndTeardown();

  describe("User Event Booking", () => {
    test(`should be able to request-reschedule for a user booking
          1. RequestReschedule emails go to both attendee and the person requesting the reschedule`, async ({
      emails,
    }) => {
      const { requestRescheduleHandler } = await import(
        "@calcom/trpc/server/routers/viewer/bookings/requestReschedule.handler"
      );
      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
      });
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const bookingUid = "MOCKED_BOOKING_UID";
      const eventTypeSlug = "event-type-1";
      await createBookingScenario(
        getScenarioData({
          webhooks: [
            {
              userId: organizer.id,
              eventTriggers: ["BOOKING_CREATED"],
              subscriberUrl: "http://my-webhook.example.com",
              active: true,
              eventTypeId: 1,
              appId: null,
            },
          ],
          eventTypes: [
            {
              id: 1,
              slug: eventTypeSlug,
              slotInterval: 45,
              length: 45,
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
              userId: 101,
              status: BookingStatus.ACCEPTED,
              startTime: `${plus1DateString}T05:00:00.000Z`,
              endTime: `${plus1DateString}T05:15:00.000Z`,
              attendees: [
                getMockBookingAttendee({
                  id: 2,
                  name: booker.name,
                  email: booker.email,
                  // Booker's locale when the fresh booking happened earlier
                  locale: "hi",
                  // Booker's timezone when the fresh booking happened earlier
                  timeZone: "Asia/Kolkata",
                }),
              ],
            },
          ],
          organizer,
          apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
        })
      );

      const loggedInUser = {
        organizationId: null,
        id: 101,
        username: "reschedule-requester",
        name: "Reschedule Requester",
        email: "reschedule-requester@example.com",
      };
      await requestRescheduleHandler(
        getTrpcHandlerData({
          user: loggedInUser,
          input: {
            bookingId: bookingUid,
            rescheduleReason: "",
          },
        })
      );

      expectBookingRequestRescheduledEmails({
        booking: {
          uid: bookingUid,
        },
        booker,
        organizer: organizer,
        loggedInUser,
        emails,
        bookNewTimePath: `/${organizer.username}/${eventTypeSlug}`,
      });
    });
  });

  describe("Team Event Booking", () => {
    test(`should be able to request-reschedule for a team event booking
          1. RequestReschedule emails go to both attendee and the person requesting the reschedule`, async ({
      emails,
    }) => {
      const { requestRescheduleHandler } = await import(
        "@calcom/trpc/server/routers/viewer/bookings/requestReschedule.handler"
      );
      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        teams: [
          {
            membership: {
              accepted: true,
            },
            team: {
              id: 1,
              name: "Team 1",
              slug: "team-1",
            },
          },
        ],
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
      });
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const bookingUid = "MOCKED_BOOKING_UID";
      const eventTypeSlug = "event-type-1";
      await createBookingScenario(
        getScenarioData({
          webhooks: [
            {
              userId: organizer.id,
              eventTriggers: ["BOOKING_CREATED"],
              subscriberUrl: "http://my-webhook.example.com",
              active: true,
              eventTypeId: 1,
              appId: null,
            },
          ],
          eventTypes: [
            {
              id: 1,
              slug: eventTypeSlug,
              slotInterval: 45,
              teamId: 1,
              schedulingType: SchedulingType.COLLECTIVE,
              length: 45,
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
              userId: 101,
              status: BookingStatus.ACCEPTED,
              startTime: `${plus1DateString}T05:00:00.000Z`,
              endTime: `${plus1DateString}T05:15:00.000Z`,
              attendees: [
                getMockBookingAttendee({
                  id: 2,
                  name: booker.name,
                  email: booker.email,
                  // Booker's locale when the fresh booking happened earlier
                  locale: "hi",
                  // Booker's timezone when the fresh booking happened earlier
                  timeZone: "Asia/Kolkata",
                }),
              ],
            },
          ],
          organizer,
          apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
        })
      );

      const loggedInUser = {
        organizationId: null,
        id: 101,
        username: "reschedule-requester",
        name: "Reschedule Requester",
        email: "reschedule-requester@example.com",
      };
      await requestRescheduleHandler(
        getTrpcHandlerData({
          user: loggedInUser,
          input: {
            bookingId: bookingUid,
            rescheduleReason: "",
          },
        })
      );

      expectBookingRequestRescheduledEmails({
        booking: {
          uid: bookingUid,
        },
        booker,
        organizer: organizer,
        loggedInUser,
        emails,
        bookNewTimePath: "/team/team-1/event-type-1",
      });
    });
    test.todo("Verify that the email should go to organizer as well as the team members");
  });
});

function getTrpcHandlerData({
  input,
  user,
}: {
  input: TRequestRescheduleInputSchema;
  user: Partial<Omit<NonNullable<TrpcSessionUser>, "id" | "email" | "username">> &
    Pick<NonNullable<TrpcSessionUser>, "id" | "email" | "username">;
}) {
  return {
    ctx: {
      user: {
        ...getSampleUserInSession(),
        ...user,
        avatarUrl: user.avatarUrl || null,
      } satisfies TrpcSessionUser,
    },
    input: input,
  };
}
