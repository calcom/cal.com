import prismock from "../../../../tests/libs/__mocks__/prisma";

import {
  getGoogleCalendarCredential,
  createBookingScenario,
  TestData,
  createCredentials,
  BookingLocations,
  getGoogleMeetCredential,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";

import { v4 as uuidv4 } from "uuid";
import { vi, beforeEach, afterEach, describe, it, expect } from "vitest";

import { appStoreMetadata } from "@calcom/app-store/apps.metadata.generated";
import { BookingStatus } from "@calcom/prisma/enums";

import { BookingReferenceRepository } from "./bookingReference";

const cleanup = async () => {
  await prismock.eventType.deleteMany();
  await prismock.user.deleteMany();
  await prismock.schedule.deleteMany();
  await prismock.selectedCalendar.deleteMany();
  await prismock.credential.deleteMany();
  await prismock.booking.deleteMany();
  await prismock.bookingReference.deleteMany();
  await prismock.app.deleteMany();
  vi.useRealTimers();
};

export function setupAndTeardown() {
  beforeEach(async () => {
    await cleanup();
  });

  afterEach(async () => {
    await cleanup();
  });
}

describe("bookingReferences", () => {
  setupAndTeardown();

  it("should reconnect bookingReference when a calendar app is reconnected", async () => {
    vi.setSystemTime("2024-10-24T00:00:10Z");

    const plus2DateString = "2024-10-26";
    const mockGoogleCredential = getGoogleCalendarCredential();
    const meetingId = uuidv4();
    const userId = 101;
    const currentCredentialId = 1;
    const bookingId = 1;
    const bookingReferenceId = 1;
    const newCredentialId = 2;

    const bookingScenarioData = {
      eventTypes: [
        {
          id: 1,
          slotInterval: 30,
          length: 30,
          users: [
            {
              id: userId,
            },
          ],
        },
      ],
      users: [
        {
          ...TestData.users.example,
          id: userId,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [{ ...mockGoogleCredential, id: currentCredentialId }],
          selectedCalendars: [
            {
              ...TestData.selectedCalendars.google,
              credential: {
                connect: {
                  id: currentCredentialId,
                },
              },
            },
          ],
        },
      ],
      apps: [TestData.apps["google-calendar"]],
      bookings: [
        {
          id: bookingId,
          eventTypeId: 1,
          userId,
          status: BookingStatus.ACCEPTED,
          startTime: `${plus2DateString}T04:30:00.000Z`,
          endTime: `${plus2DateString}T05:00:00.000Z`,
          references: [
            {
              id: bookingReferenceId,
              type: appStoreMetadata.googlecalendar.type,
              uid: meetingId,
              meetingId,
              meetingUrl: "https://meet.google.com/mock",
              externalCalendarId: TestData.selectedCalendars.google.externalId,
              credential: {
                connect: {
                  id: currentCredentialId,
                },
              },
            },
          ],
        },
      ],
    };

    await createBookingScenario(bookingScenarioData);

    //mock disconnet google-calendar app,
    //credential and selectedCalendar gets deleted in db.
    await prismock.credential.delete({
      where: { id: currentCredentialId },
    });

    //mock reconnect or reinstall google-calendar app,
    //new credential and selectedCalendar is created in db.
    await createCredentials([
      {
        type: mockGoogleCredential.type,
        key: mockGoogleCredential.key,
        id: newCredentialId,
        userId,
      },
    ]);
    await prismock.selectedCalendar.create({
      data: {
        ...TestData.selectedCalendars.google,
        user: {
          connect: {
            id: userId,
          },
        },
        credential: {
          connect: {
            id: newCredentialId,
          },
        },
      },
    });

    await BookingReferenceRepository.reconnectWithNewCredential(newCredentialId);

    //verify booking reference is reconnected to new cred
    const bookingReference = await prismock.bookingReference.findUnique({
      where: {
        id: bookingReferenceId,
      },
      select: {
        credentialId: true,
      },
    });
    expect(bookingReference?.credentialId).toStrictEqual(newCredentialId);
  });

  it("should reconnect bookingReference when 'google-calendar' and 'google-meet' apps are reconnected", async () => {
    vi.setSystemTime("2024-10-24T00:00:10Z");

    const plus2DateString = "2024-10-26";
    const mockGoogleCalCredential = getGoogleCalendarCredential();
    const mockGoogleMeetCredential = getGoogleMeetCredential();
    const meetingId = uuidv4();
    const userId = 101;
    const currentGoogleCalCredentialId = 1;
    const currentGoogleMeetCredentialId = 2;
    const bookingId = 1;
    const bookingReferenceId_Cal = 1;
    const bookingReferenceId_Video = 2;
    const newGoogleCalCredentialId = 3;
    const newGoogleMeetCredentialId = 4;

    const bookingScenarioData = {
      eventTypes: [
        {
          id: 1,
          slotInterval: 30,
          length: 30,
          users: [
            {
              id: userId,
            },
          ],
          locations: [
            {
              type: BookingLocations.GoogleMeet,
            },
          ],
          destinationCalendar: {
            integration: "google_calendar",
            externalId: "event-type-1@example.com",
          },
        },
      ],
      users: [
        {
          ...TestData.users.example,
          id: userId,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [
            { ...mockGoogleCalCredential, id: currentGoogleCalCredentialId },
            { ...mockGoogleMeetCredential, id: currentGoogleMeetCredentialId },
          ],
          selectedCalendars: [
            {
              ...TestData.selectedCalendars.google,
              credential: {
                connect: {
                  id: currentGoogleCalCredentialId,
                },
              },
            },
          ],
        },
      ],
      apps: [TestData.apps["google-calendar"], TestData.apps["google-meet"]],
      bookings: [
        {
          id: bookingId,
          eventTypeId: 1,
          userId,
          status: BookingStatus.ACCEPTED,
          location: BookingLocations.GoogleMeet,
          startTime: `${plus2DateString}T04:30:00.000Z`,
          endTime: `${plus2DateString}T05:00:00.000Z`,
          references: [
            {
              id: bookingReferenceId_Cal,
              type: appStoreMetadata.googlecalendar.type,
              uid: meetingId,
              meetingId,
              meetingUrl: "https://meet.google.com/mock-link",
              externalCalendarId: TestData.selectedCalendars.google.externalId,
              credential: {
                connect: {
                  id: currentGoogleCalCredentialId,
                },
              },
            },
            {
              id: bookingReferenceId_Video,
              type: "google_meet_video",
              uid: meetingId,
              meetingId,
              meetingUrl: "https://meet.google.com/mock-link",
              externalCalendarId: null,
              credential: {
                connect: {
                  id: currentGoogleCalCredentialId,
                },
              },
            },
          ],
        },
      ],
    };

    await createBookingScenario(bookingScenarioData);

    //mock disconnet google-calendar app and google-video,
    //credential and selectedCalendar gets deleted in db.
    await prismock.credential.deleteMany({
      where: { id: { in: [currentGoogleCalCredentialId, currentGoogleMeetCredentialId] } },
    });

    //mock reconnect or reinstall google-calendar app and google-video,
    //new credential and selectedCalendar is created in db.
    await createCredentials([
      {
        id: newGoogleCalCredentialId,
        type: mockGoogleCalCredential.type,
        key: mockGoogleCalCredential.key,
        userId,
      },
      {
        id: newGoogleMeetCredentialId,
        type: mockGoogleMeetCredential.type,
        key: mockGoogleMeetCredential.key,
        userId,
      },
    ]);
    await prismock.selectedCalendar.create({
      data: {
        ...TestData.selectedCalendars.google,
        user: {
          connect: {
            id: userId,
          },
        },
        credential: {
          connect: {
            id: newGoogleCalCredentialId,
          },
        },
      },
    });

    await BookingReferenceRepository.reconnectWithNewCredential(newGoogleCalCredentialId);

    //verify both bookingReferences are reconnected to new google_calendar credential
    const bookingReferences = await prismock.bookingReference.findMany({
      where: {
        id: {
          in: [bookingReferenceId_Cal, bookingReferenceId_Video],
        },
      },
      select: {
        credentialId: true,
      },
    });
    expect(bookingReferences[0].credentialId).toStrictEqual(newGoogleCalCredentialId);
    expect(bookingReferences[1].credentialId).toStrictEqual(newGoogleCalCredentialId);
  });
});
