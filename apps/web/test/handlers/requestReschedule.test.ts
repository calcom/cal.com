import { getSampleUserInSession } from "../utils/bookingScenario/getSampleUserInSession";
import { setupAndTeardown } from "../utils/bookingScenario/setupAndTeardown";
import {
  createBookingScenario,
  getGoogleCalendarCredential,
  TestData,
  getOrganizer,
  getBooker,
  getScenarioData,
  getMockBookingAttendee,
  getDate,
  mockCalendar,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import { expectBookingRequestRescheduledEmails } from "@calcom/web/test/utils/bookingScenario/expects";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { describe, expect } from "vitest";

import { SchedulingType, MembershipRole } from "@calcom/prisma/enums";
import { BookingStatus } from "@calcom/prisma/enums";
import type { TRequestRescheduleInputSchema } from "@calcom/trpc/server/routers/viewer/bookings/requestReschedule.schema";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { test } from "@calcom/web/test/fixtures/fixtures";

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
                  noShow: false,
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
            bookingUid,
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
                  noShow: false,
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
            bookingUid,
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

    test(`should allow team admin to request-reschedule for a team booking and use organizer's credentials
          1. Team admin (non-organizer) can request reschedule with proper permissions
          2. Organizer's credentials are used to delete calendar events`, async ({ emails }) => {
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
              role: "MEMBER",
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

      const teamAdmin = {
        id: 102,
        username: "team-admin",
        name: "Team Admin",
        email: "team-admin@example.com",
        locale: "en",
        timeZone: "America/New_York",
        teams: [
          {
            membership: {
              accepted: true,
              role: MembershipRole.ADMIN,
            },
            team: {
              id: 1,
              name: "Team 1",
              slug: "team-1",
            },
          },
        ],
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [], // No credentials
        selectedCalendars: [],
      };

      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const bookingUid = "MOCKED_BOOKING_UID_TEAM_ADMIN";
      const eventTypeSlug = "event-type-1";

      const calendarMock = await mockCalendar("googlecalendar");

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
              userId: 101, // Booking belongs to organizer
              status: BookingStatus.ACCEPTED,
              startTime: `${plus1DateString}T05:00:00.000Z`,
              endTime: `${plus1DateString}T05:15:00.000Z`,
              references: [
                {
                  type: "google_calendar",
                  uid: "MOCK_CALENDAR_EVENT_UID",
                  meetingId: "MOCK_MEETING_ID",
                  meetingPassword: "MOCK_PASSWORD",
                  meetingUrl: "https://UNUSED_URL",
                  credentialId: 1,
                },
              ],
              attendees: [
                getMockBookingAttendee({
                  id: 2,
                  name: booker.name,
                  email: booker.email,
                  locale: "hi",
                  timeZone: "Asia/Kolkata",
                  noShow: false,
                }),
              ],
            },
          ],
          organizer,
          usersApartFromOrganizer: [teamAdmin],
          apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
        })
      );

      const loggedInTeamAdmin = {
        organizationId: null,
        id: 102, // Team admin ID
        username: "team-admin",
        name: "Team Admin",
        email: "team-admin@example.com",
      };

      await requestRescheduleHandler(
        getTrpcHandlerData({
          user: loggedInTeamAdmin,
          input: {
            bookingUid,
            rescheduleReason: "Team admin requesting reschedule",
          },
        })
      );

      expectBookingRequestRescheduledEmails({
        booking: {
          uid: bookingUid,
        },
        booker,
        organizer: organizer,
        loggedInUser: loggedInTeamAdmin,
        emails,
        bookNewTimePath: "/team/team-1/event-type-1",
      });

      const deleteEventCalls = calendarMock.deleteEventCalls;
      expect(deleteEventCalls.length).toBe(1);

      const credentialUsed = deleteEventCalls[0].calendarServiceConstructorArgs.credential;
      expect(credentialUsed.userId).toBe(organizer.id);
      expect(credentialUsed.id).toBe(1);
    });

    test(`should reject request-reschedule from team member without proper permissions`, async () => {
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
              role: "MEMBER",
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

      const teamMember = {
        id: 103,
        username: "team-member",
        name: "Team Member",
        email: "team-member@example.com",
        locale: "en",
        timeZone: "America/New_York",
        teams: [
          {
            membership: {
              accepted: true,
              role: MembershipRole.MEMBER,
            },
            team: {
              id: 1,
              name: "Team 1",
              slug: "team-1",
            },
          },
        ],
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [],
        selectedCalendars: [],
      };

      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const bookingUid = "MOCKED_BOOKING_UID_MEMBER";
      const eventTypeSlug = "event-type-1";

      await createBookingScenario(
        getScenarioData({
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
              userId: 101, // Booking belongs to organizer
              status: BookingStatus.ACCEPTED,
              startTime: `${plus1DateString}T05:00:00.000Z`,
              endTime: `${plus1DateString}T05:15:00.000Z`,
              attendees: [
                getMockBookingAttendee({
                  id: 2,
                  name: booker.name,
                  email: booker.email,
                  locale: "hi",
                  timeZone: "Asia/Kolkata",
                  noShow: false,
                }),
              ],
            },
          ],
          organizer,
          usersApartFromOrganizer: [teamMember],
          apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
        })
      );

      const loggedInTeamMember = {
        organizationId: null,
        id: 103, // Team member ID
        username: "team-member",
        name: "Team Member",
        email: "team-member@example.com",
      };

      await expect(
        requestRescheduleHandler(
          getTrpcHandlerData({
            user: loggedInTeamMember,
            input: {
              bookingUid,
              rescheduleReason: "Team member trying to reschedule",
            },
          })
        )
      ).rejects.toThrow("User does not have permission to request reschedule for this booking");
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
        profile: {
          upId: "",
          id: 1,
          name: "",
          avatarUrl: "",
          startTime: 0,
          endTime: 0,
          username: user.username || "",
          organizationId: null,
          organization: null,
          bufferTime: 5,
          avatar: null,
        },
      } as unknown as NonNullable<TrpcSessionUser>,
    },
    input: input,
  };
}
