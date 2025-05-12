import { v4 as uuidv4 } from "uuid";

import Office365CalendarService from "@calcom/app-store/office365calendar/lib/CalendarService";
import { getTimeMax, getTimeMin } from "@calcom/features/calendar-cache/lib/datesForCache";
import { getTranslation } from "@calcom/lib/server/i18n";
import { TimeFormat } from "@calcom/lib/timeFormat";
import { prisma } from "@calcom/prisma";
import { MembershipRole, SchedulingType } from "@calcom/prisma/client";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import type { NewCalendarEventType } from "@calcom/types/Calendar";
import type { CredentialForCalendarServiceWithTenantId } from "@calcom/types/Credential";
import { type createUsersFixture } from "@calcom/web/playwright/fixtures/users";
import { test } from "@calcom/web/playwright/lib/fixtures";

const integration = "office365_calendar";
const appSlug = "office365-calendar";
const client_id = process.env.E2E_TEST_OUTLOOK_CALENDAR_CLIENT_ID;
const client_secret = process.env.E2E_TEST_OUTLOOK_CALENDAR_CLIENT_KEY;
const tenant_id = process.env.E2E_TEST_OUTLOOK_CALENDAR_TENANT_ID;
const testUserEmail = process.env.E2E_TEST_OUTLOOK_CALENDAR_EMAIL;
const testUserPassword = process.env.E2E_TEST_OUTLOOK_CALENDAR_PASSWORD;

export async function setUpTestUserForIntegrationTest(users: ReturnType<typeof createUsersFixture>) {
  let outlookCredential: CredentialForCalendarServiceWithTenantId | undefined = undefined;
  let destinationCalendar;
  let selectedCalendar;

  // Configure the app with test outlook account from env
  if (client_id && client_secret) {
    await prisma.app.update({
      where: {
        slug: appSlug,
      },
      data: {
        keys: { client_id, client_secret },
      },
    });
  } else {
    test.skip(!client_id || !client_secret, "Outlook App keys not found");
  }

  const teamEventSlug = `test-team-event-${uuidv4()}`;
  const testUser = await users.create(null, {
    hasTeam: true,
    teamRole: MembershipRole.ADMIN,
    teamEventSlug,
    schedulingType: SchedulingType.ROUND_ROBIN,
    teamEventLength: 120,
    assignAllTeamMembers: true,
  });
  const membership = await testUser.getFirstTeamMembership();
  const teamId = membership.team.id;
  const teamSlug = membership.team.slug;

  outlookCredential = await fetchTokensAndCreateCredential(testUser.id);

  test.skip(!outlookCredential?.id, "Outlook QA credential not found");

  const outlookCalendarService = new Office365CalendarService(outlookCredential!);
  const calendars = await outlookCalendarService.listCalendars();
  const primaryCalendar = calendars.find((calendar) => calendar.primary);

  test.skip(!primaryCalendar || !primaryCalendar.externalId, "Primary Calendar not found");

  if (primaryCalendar && outlookCredential) {
    selectedCalendar = await prisma.selectedCalendar.create({
      data: {
        user: {
          connect: {
            id: testUser.id,
          },
        },
        integration,
        externalId: primaryCalendar.externalId,
        credential: {
          connect: {
            id: outlookCredential.id,
          },
        },
      },
    });

    destinationCalendar = await prisma.destinationCalendar.create({
      data: {
        user: {
          connect: {
            id: testUser.id,
          },
        },
        integration,
        externalId: primaryCalendar.externalId,
        primaryEmail: testUserEmail,
        credential: {
          connect: {
            id: outlookCredential.id,
          },
        },
      },
    });

    // Set feature 'calendar-cache' for the team
    await prisma.teamFeatures.create({
      data: {
        teamId: teamId,
        featureId: "calendar-cache",
        assignedBy: testUser.username ?? testUser.email,
      },
    });
  }

  return {
    credentialId: outlookCredential?.id,
    destinationCalendar: destinationCalendar,
    selectedCalendarId: selectedCalendar?.id,
    externalId: selectedCalendar?.externalId,
    user: testUser,
    teamEventSlug,
    teamSlug,
  };
}

// Creates events in actual Microsoft Outlook Calendar
export async function createOutlookCalendarEvents(credentialId: number, destinationCalendar: any, user: any) {
  const qaRefreshedOutlookCredential = {
    ...(await prisma.credential.findFirstOrThrow({
      where: {
        id: credentialId,
      },
      select: credentialForCalendarServiceSelect,
    })),
    delegatedTo: null,
  } as CredentialForCalendarServiceWithTenantId;

  const outlookCalendarService = new Office365CalendarService(qaRefreshedOutlookCredential);

  const tFunction = await getTranslation("en", "common");
  const baseEvent = {
    title: "E2E_TEST_TEAM_EVENT",
    type: "e2e-test-team-event",
    organizer: {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      timeZone: "Europe/London",
      language: {
        translate: tFunction,
        locale: "en",
      },
      timeFormat: TimeFormat.TWELVE_HOUR,
    },
    attendees: [],
    location: "inPerson:123 Happy lane",
    destinationCalendar: [destinationCalendar],
  };

  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const expectedCacheKey = JSON.stringify({
    timeMin: getTimeMin(),
    timeMax: getTimeMax(),
    items: [{ id: destinationCalendar.externalId }],
  });
  // Create Busy time - 1st, 2nd, 3rd Days of next month 8AM - 1PM (UTC:0)
  const busyEvents = [
    {
      start: new Date(Date.UTC(nextMonth.getFullYear(), nextMonth.getMonth(), 1, 8, 0, 0)).toISOString(),
      end: new Date(Date.UTC(nextMonth.getFullYear(), nextMonth.getMonth(), 1, 13, 0, 0)).toISOString(),
    },
    {
      start: new Date(Date.UTC(nextMonth.getFullYear(), nextMonth.getMonth(), 2, 8, 0, 0)).toISOString(),
      end: new Date(Date.UTC(nextMonth.getFullYear(), nextMonth.getMonth(), 2, 13, 0, 0)).toISOString(),
    },
    {
      start: new Date(Date.UTC(nextMonth.getFullYear(), nextMonth.getMonth(), 3, 8, 0, 0)).toISOString(),
      end: new Date(Date.UTC(nextMonth.getFullYear(), nextMonth.getMonth(), 3, 13, 0, 0)).toISOString(),
    },
  ];

  const outlookCalEventsCreated: NewCalendarEventType[] = [];
  for (const event of busyEvents) {
    outlookCalEventsCreated.push(
      await outlookCalendarService.createEvent(
        { ...baseEvent, startTime: event.start, endTime: event.end },
        credentialId
      )
    );
  }
  return { outlookCalEventsCreated, expectedCacheKey, expectedCacheValue: busyEvents };
}

// Invokes office365Calendar/webhook to trigger fetchAvailabilityAndSetCache()
export async function callWebhook(
  outlookSubscriptionId: string,
  outlookSubscriptionExpiration: string,
  externalId: string
) {
  const webhookResponse = await fetch(
    `${process.env.NEXT_PUBLIC_WEBAPP_URL}/api/integrations/office365calendar/webhook`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        value: [
          {
            subscriptionId: outlookSubscriptionId,
            subscriptionExpirationDateTime: outlookSubscriptionExpiration,
            changeType: "created",
            resource: `Users/${testUserEmail}/Events/${externalId}`,
            resourceData: {
              "@odata.type": "#Microsoft.Graph.Event",
              "@odata.id": `Users/${testUserEmail}/Events/${externalId}",
                  "@odata.etag": 'W/"DwAAABYAAACZjeWCC/mnRbEM5y7oYy4AAAABxutl"`,
              id: externalId,
            },
            clientState: process.env.MICROSOFT_WEBHOOK_TOKEN,
            tenantId: "",
          },
        ],
      }),
    }
  );
  return webhookResponse;
}

// Deletes the events on actual Microsoft Outlook Calendar
export async function deleteOutlookCalendarEvents(events: NewCalendarEventType[], credentialId: number) {
  const qaRefreshedOutlookCredential = {
    ...(await prisma.credential.findFirstOrThrow({
      where: {
        id: credentialId,
      },
      select: credentialForCalendarServiceSelect,
    })),
    delegatedTo: null,
  } as CredentialForCalendarServiceWithTenantId;

  const outlookCalendarService = new Office365CalendarService(qaRefreshedOutlookCredential);
  for (const event of events) {
    await outlookCalendarService.deleteEvent(event.id);
  }
}

// Uses ROPC flow to fetch tokens directly using password.
// For this the test user must be configured with ROPC flow in azure portal.
// Skips the test if credentials are not available or if any error fetching the tokens.
async function fetchTokensAndCreateCredential(userId: number) {
  test.skip(!testUserEmail || !testUserPassword, "Not able to install outlook calendar");

  let credential: CredentialForCalendarServiceWithTenantId | undefined = undefined;

  try {
    if (testUserEmail && testUserPassword && client_id && client_secret && tenant_id) {
      const scopes = ["User.Read", "Calendars.Read", "Calendars.ReadWrite", "offline_access"];
      const tokenEndpoint = `https://login.microsoftonline.com/${tenant_id}/oauth2/v2.0/token`;
      const body = new URLSearchParams({
        client_id,
        scope: scopes.join(" "),
        username: testUserEmail,
        password: testUserPassword,
        grant_type: "password",
        client_secret,
      });
      const response = await fetch(tokenEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });
      const data = await response.json();

      if (data["access_token"]) {
        credential = {
          ...(await prisma.credential.create({
            data: {
              type: integration,
              key: data,
              user: {
                connect: {
                  id: userId,
                },
              },
              app: {
                connect: {
                  slug: appSlug,
                },
              },
            },
            select: credentialForCalendarServiceSelect,
          })),
          delegatedTo: null,
        } as CredentialForCalendarServiceWithTenantId;
      } else {
        test.skip(true, "Not able to install outlook calendar");
      }
      return credential;
    }
  } catch (err) {
    test.skip(true, "Not able to install outlook calendar");
  }
}

export async function setUpTestUserWithOutlookCalendar(users: ReturnType<typeof createUsersFixture>) {
  const email = "testCal@outlook.com";
  const externalId = "mock_outlook_external_id_1";

  const teamEventSlug = `test-team-event-${uuidv4()}`;
  const testUser = await users.create(null, {
    hasTeam: true,
    teamRole: MembershipRole.ADMIN,
    teamEventSlug,
    schedulingType: SchedulingType.ROUND_ROBIN,
    teamEventLength: 120,
    assignAllTeamMembers: true,
  });
  const membership = await testUser.getFirstTeamMembership();
  const teamSlug = membership.team.slug;

  const credential = await prisma.credential.create({
    data: {
      type: integration,
      key: {
        email,
        scope: "User.Read Calendars.Read Calendars.ReadWrite",
        token_type: "Bearer",
        expiry_date: 1746452074000,
        access_token: "mock_access_token",
        refresh_token: "mock_refresh_token",
        ext_expires_in: 3600,
      },
      user: {
        connect: {
          id: testUser.id,
        },
      },
      app: {
        connect: {
          slug: appSlug,
        },
      },
    },
  });

  await prisma.selectedCalendar.create({
    data: {
      user: {
        connect: {
          id: testUser.id,
        },
      },
      integration,
      externalId: externalId,
      credential: {
        connect: {
          id: credential.id,
        },
      },
    },
  });

  await prisma.destinationCalendar.create({
    data: {
      user: {
        connect: {
          id: testUser.id,
        },
      },
      integration,
      externalId: externalId,
      primaryEmail: email,
      credential: {
        connect: {
          id: credential.id,
        },
      },
    },
  });

  return { credential, teamSlug, teamEventSlug, externalId };
}
