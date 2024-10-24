import prismock from "../../../../tests/libs/__mocks__/prisma";

import {
  getGoogleCalendarCredential,
  createBookingScenario,
  TestData,
  createCredentials,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";

import { v4 as uuidv4 } from "uuid";
import { vi, beforeEach, afterEach, describe, it, expect } from "vitest";

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

  it("should reconnect bookingReference when new credential is created", async () => {
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
              type: "google_calendar",
              uid: meetingId,
              meetingId,
              meetingUrl: "https://meet.google.com/jjo-ovji-edq",
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
});
