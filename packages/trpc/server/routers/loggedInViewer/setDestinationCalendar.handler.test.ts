import prisma from "../../../../../tests/libs/__mocks__/prisma";

import {
  createBookingScenario,
  TestData,
  getOrganizer,
  getScenarioData,
  createOrganization,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import { describe, it, vi, expect } from "vitest";

import { getConnectedCalendars } from "@calcom/core/CalendarManager";
import { SchedulingType, MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../trpc";
import { setDestinationCalendarHandler } from "./setDestinationCalendar.handler";

vi.mock("@calcom/core/CalendarManager", () => ({
  getConnectedCalendars: vi.fn(),
  getCalendarCredentials: vi.fn().mockImplementation((creds) => creds),
}));

const createDwdCredential = async (orgId: number) => {
  const workspace = await prisma.workspacePlatform.create({
    data: {
      name: "Test Workspace",
      slug: "google",
      description: "Test Workspace",
      defaultServiceAccountKey: {
        type: "service_account",
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        client_id: "CLIENT_ID",
        token_uri: "https://oauth2.googleapis.com/token",
        project_id: "PROJECT_ID",
        private_key: "PRIVATE_KEY",
        client_email: "CLIENT_EMAIL",
        private_key_id: "PRIVATE_KEY_ID",
        universe_domain: "googleapis.com",
        client_x509_cert_url: "CLIENT_X509_CERT_URL",
        auth_provider_x509_cert_url: "AUTH_PROVIDER_X509_CERT_URL",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      enabled: true,
    },
  });

  const dwd = await prisma.domainWideDelegation.create({
    data: {
      workspacePlatform: {
        connect: {
          id: workspace.id,
        },
      },
      domain: "example.com",
      enabled: true,
      organization: {
        connect: {
          id: orgId,
        },
      },
      serviceAccountKey: workspace.defaultServiceAccountKey,
    },
  });

  return dwd;
};

describe("setDestinationCalendarHandler", () => {
  setupAndTeardown();

  it("should successfully set destination calendar with DWD credentials", async () => {
    const org = await createOrganization({
      name: "Test Org",
      slug: "testorg",
    });

    const childTeam = {
      id: 202,
      name: "Team 1",
      slug: "team-1",
      parentId: org.id,
    };

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
        {
          membership: {
            accepted: true,
            role: MembershipRole.ADMIN,
          },
          team: {
            id: childTeam.id,
            name: "Team 1",
            slug: "team-1",
            parentId: org.id,
          },
        },
      ],
    });

    const dwd = await createDwdCredential(org.id);

    const dwdCredentialId = dwd.id;
    const testExternalId = "TEST@group.calendar.google.com";

    // Mock the getConnectedCalendars response
    (getConnectedCalendars as jest.Mock).mockResolvedValue({
      connectedCalendars: [
        {
          calendars: [
            {
              externalId: organizer.email,
              integration: "google_calendar",
              readOnly: false,
              primary: true,
              email: organizer.email,
              credentialId: -1,
              domainWideDelegationCredentialId: dwdCredentialId,
            },
            {
              externalId: testExternalId,
              integration: "google_calendar",
              readOnly: false,
              primary: null,
              email: organizer.email,
              credentialId: -1,
              domainWideDelegationCredentialId: dwdCredentialId,
            },
          ],
        },
      ],
    });

    await createBookingScenario(
      getScenarioData(
        {
          organizer,
          eventTypes: [
            {
              id: 1,
              teamId: childTeam.id,
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
              domainWideDelegationCredentialId: dwdCredentialId,
            },
          ],
        },
        org
      )
    );

    const dd1 = await prisma.destinationCalendar.findMany({
      where: {
        userId: organizer.id,
      },
    });

    console.log("destinatonCalendar1", dd1);

    const ctx = {
      user: {
        id: organizer.id,
        email: organizer.email,
        selectedCalendars: [
          {
            integration: "google_calendar",
            externalId: testExternalId,
            credentialId: null,
            domainWideDelegationCredentialId: dwdCredentialId,
          },
        ],
      } as NonNullable<TrpcSessionUser>,
    };

    await setDestinationCalendarHandler({
      ctx,
      input: {
        integration: "google_calendar",
        externalId: testExternalId,
      },
    });

    // Verify the destination calendar was set correctly
    const destinationCalendar = await prisma.destinationCalendar.findFirst({
      where: {
        userId: organizer.id,
      },
    });

    expect(destinationCalendar).toEqual(
      expect.objectContaining({
        integration: "google_calendar",
        externalId: testExternalId,
        credentialId: null,
        domainWideDelegationCredentialId: dwdCredentialId,
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
        selectedCalendars: [],
      } as NonNullable<TrpcSessionUser>,
    };

    await expect(
      setDestinationCalendarHandler({
        ctx,
        input: {
          integration: "google_calendar",
          externalId: "non-existent-calendar",
          eventTypeId: null,
        },
      })
    ).rejects.toThrow(
      new TRPCError({ code: "BAD_REQUEST", message: "Could not find calendar non-existent-calendar" })
    );
  });
});
