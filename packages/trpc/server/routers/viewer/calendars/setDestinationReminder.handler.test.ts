import prisma from "../../../../../../tests/libs/__mocks__/prisma";

import {
  createBookingScenario,
  TestData,
  getOrganizer,
  getScenarioData,
  createOrganization,
  createDelegationCredential,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import { describe, it, expect } from "vitest";

import { SchedulingType, MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import { setDestinationReminderHandler } from "./setDestinationReminder.handler";

describe("setDestinationReminderHandler", () => {
  setupAndTeardown();

  it("should successfully set destination calendar reminder", async () => {
    const org = await createOrganization({
      name: "Test Org",
      slug: "testorg",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
      teams: [
        {
          membership: {
            accepted: true,
            role: MembershipRole.ADMIN,
          },
          team: {
            id: org.id,
            name: "Test Org",
            slug: "testorg",
          },
        },
      ],
    });

    const delegationCredential = await createDelegationCredential(org.id);
    const testExternalId = "TEST@group.calendar.google.com";

    await createBookingScenario(
      getScenarioData(
        {
          organizer,
          eventTypes: [
            {
              id: 1,
              teamId: org.id,
              schedulingType: SchedulingType.ROUND_ROBIN,
              length: 30,
              hosts: [
                {
                  userId: 101,
                  isFixed: false,
                },
              ],
            },
          ],
          selectedCalendars: [
            {
              integration: "google_calendar",
              externalId: testExternalId,
              credentialId: null,
              delegationCredentialId: delegationCredential.id,
            },
          ],
        },
        org
      )
    );

    // Create a destination calendar first
    await prisma.destinationCalendar.create({
      data: {
        integration: "google_calendar",
        externalId: testExternalId,
        userId: organizer.id,
        credentialId: delegationCredential.id,
      },
    });

    const ctx = {
      user: {
        id: organizer.id,
        email: organizer.email,
      } as NonNullable<TrpcSessionUser>,
    };

    const result = await setDestinationReminderHandler({
      ctx,
      input: {
        credentialId: delegationCredential.id,
        integration: "google_calendar",
        defaultReminder: 30,
      },
    });

    expect(result).toEqual({ success: true });

    // Verify the reminder was set correctly
    const destinationCalendar = await prisma.destinationCalendar.findFirst({
      where: {
        credentialId: delegationCredential.id,
        integration: "google_calendar",
      },
    });

    expect(destinationCalendar).toEqual(
      expect.objectContaining({
        customCalendarReminder: 30,
      })
    );
  });

  it("should successfully update existing destination calendar reminder", async () => {
    const org = await createOrganization({
      name: "Test Org",
      slug: "testorg",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
    });

    const delegationCredential = await createDelegationCredential(org.id);
    const testExternalId = "TEST@group.calendar.google.com";

    await createBookingScenario(
      getScenarioData({
        organizer,
        eventTypes: [
          {
            id: 1,
            length: 30,
          },
        ],
      })
    );

    // Create a destination calendar with an initial reminder
    await prisma.destinationCalendar.create({
      data: {
        integration: "google_calendar",
        externalId: testExternalId,
        userId: organizer.id,
        credentialId: delegationCredential.id,
        customCalendarReminder: 10,
      },
    });

    const ctx = {
      user: {
        id: organizer.id,
        email: organizer.email,
      } as NonNullable<TrpcSessionUser>,
    };

    const result = await setDestinationReminderHandler({
      ctx,
      input: {
        credentialId: delegationCredential.id,
        integration: "google_calendar",
        defaultReminder: 60,
      },
    });

    expect(result).toEqual({ success: true });

    // Verify the reminder was updated correctly
    const destinationCalendar = await prisma.destinationCalendar.findFirst({
      where: {
        credentialId: delegationCredential.id,
        integration: "google_calendar",
      },
    });

    expect(destinationCalendar).toEqual(
      expect.objectContaining({
        customCalendarReminder: 60,
      })
    );
  });

  it("should throw error when calendar is not found", async () => {
    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
    });

    const ctx = {
      user: {
        id: organizer.id,
        email: organizer.email,
      } as NonNullable<TrpcSessionUser>,
    };

    await expect(
      setDestinationReminderHandler({
        ctx,
        input: {
          credentialId: 999,
          integration: "google_calendar",
          defaultReminder: 30,
        },
      })
    ).rejects.toThrow(new TRPCError({ code: "NOT_FOUND", message: "Selected calendar not found" }));
  });
});
