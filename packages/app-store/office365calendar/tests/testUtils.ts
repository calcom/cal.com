import Office365CalendarService from "@calcom/app-store/office365calendar/lib/CalendarService";
import { getTimeMax, getTimeMin } from "@calcom/features/calendar-cache/lib/datesForCache";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { DEFAULT_SCHEDULE, getAvailabilityFromSchedule } from "@calcom/lib/availability";
import { getTranslation } from "@calcom/lib/server/i18n";
import { DestinationCalendarRepository } from "@calcom/lib/server/repository/destinationCalendar";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";
import { TimeFormat } from "@calcom/lib/timeFormat";
import { prisma } from "@calcom/prisma";
import { MembershipRole, SchedulingType } from "@calcom/prisma/client";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import type { NewCalendarEventType } from "@calcom/types/Calendar";
import type { CredentialForCalendarServiceWithTenantId } from "@calcom/types/Credential";
import { TimeZoneEnum } from "@calcom/web/playwright/fixtures/types";
import { createTeamEventType, type createUsersFixture } from "@calcom/web/playwright/fixtures/users";
import { test } from "@calcom/web/playwright/lib/fixtures";

export const testUserEmail = process.env.E2E_TEST_OUTLOOK_CALENDAR_EMAIL;
const integration = "office365_calendar";
const appSlug = "office365-calendar";
let testScheduleId = -1;
let testSelectedCalendarId = "";
let testDestinationCalendarId = -1;
let testTeamId = -1;
const client_id = process.env.E2E_TEST_OUTLOOK_CALENDAR_CLIENT_ID;
const client_secret = process.env.E2E_TEST_OUTLOOK_CALENDAR_CLIENT_KEY;
const tenant_id = process.env.E2E_TEST_OUTLOOK_CALENDAR_TENANT_ID;

export async function setUpTestUserForIntegrationTest(
  users: ReturnType<typeof createUsersFixture>,
  testTeamSlug: string,
  testTeamEventSlug: string
) {
  let qaOutlookCredential: CredentialForCalendarServiceWithTenantId | undefined = undefined;
  let destinationCalendar;
  let selectedCalendar;

  //Check for global feature and skip if false
  const featuresRepository = new FeaturesRepository();
  const isCalendarCacheEnabled = await featuresRepository.checkIfFeatureIsEnabledGlobally("calendar-cache");
  test.skip(!isCalendarCacheEnabled, "Calendar Cache is not enabled globally");

  // test.skip(!!APP_CREDENTIAL_SHARING_ENABLED, "Credential sharing enabled");

  // Configure the app with real OAuth credentials
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

  const testUser = await users.create();

  qaOutlookCredential = await fetchTokensAndCreateCredential(testUser.id);

  test.skip(!qaOutlookCredential?.id, "Outlook QA credential not found");

  const outlookCalendarService = new Office365CalendarService(qaOutlookCredential!);
  const calendars = await outlookCalendarService.listCalendars();
  const primaryCalendar = calendars.find((calendar) => calendar.primary);

  test.skip(!primaryCalendar || !primaryCalendar.externalId, "Primary Calendar not found");

  if (primaryCalendar && qaOutlookCredential) {
    selectedCalendar = await SelectedCalendarRepository.createIfNotExists({
      userId: testUser.id,
      externalId: primaryCalendar.externalId,
      eventTypeId: null,
      integration: integration,
      credentialId: qaOutlookCredential?.id,
    });
    testSelectedCalendarId = selectedCalendar.id;
    destinationCalendar = await DestinationCalendarRepository.upsert({
      where: {
        userId: testUser.id,
        externalId: primaryCalendar.externalId,
        eventTypeId: undefined,
      },
      update: {},
      create: {
        integration: integration,
        externalId: primaryCalendar.externalId,
        credentialId: qaOutlookCredential?.id,
        primaryEmail: testUserEmail,
      },
    });
    testDestinationCalendarId = destinationCalendar.id;
  }

  // Create new Availability in default test timezone:Europe/London and set it as default for qa user
  const testSchedule = await prisma.schedule.create({
    data: {
      name: "Working Hours",
      timeZone: TimeZoneEnum.UK,
      availability: {
        createMany: {
          data: getAvailabilityFromSchedule(DEFAULT_SCHEDULE),
        },
      },
      user: {
        connect: {
          id: testUser.id,
        },
      },
    },
  });
  await prisma.user.update({ where: { id: testUser.id }, data: { defaultScheduleId: testSchedule.id } });
  testScheduleId = testSchedule.id; //saving to delete after test

  const testTeam = await prisma.team.create({
    data: {
      name: "E2E_TEST_TEAM",
      slug: testTeamSlug,
    },
  });
  testTeamId = testTeam.id;
  await prisma.membership.create({
    data: {
      createdAt: new Date(),
      teamId: testTeam.id,
      userId: testUser.id,
      role: MembershipRole.ADMIN,
      accepted: true,
    },
  });

  // Set feature 'calendar-cache' for the team
  await prisma.teamFeatures.create({
    data: {
      teamId: testTeam.id,
      featureId: "calendar-cache",
      assignedBy: testUser.username ?? testUser.email,
    },
  });

  await createTeamEventType(testUser, testTeam, {
    schedulingType: SchedulingType.COLLECTIVE,
    teamEventLength: 120,
    teamEventSlug: testTeamEventSlug,
    locations: [{ type: "inPerson", address: "123 Happy lane" }],
  });

  return {
    credentialId: qaOutlookCredential?.id,
    destinationCalendar: destinationCalendar,
    selectedCalendarId: selectedCalendar?.id,
    externalId: selectedCalendar?.externalId,
    userId: testUser.id,
    teamEventSlug: testTeamEventSlug,
    teamSlug: testTeamSlug,
  };
}

export async function createOutlookCalendarEvents(
  credentialId: number | undefined,
  destinationCalendar: any,
  userId: number | undefined
) {
  if (!credentialId)
    return { outlookCalEventsCreated: [], expectedCacheKey: undefined, expectedCacheValue: undefined };
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
    title: "E2E_TEST_TEAM_EVENT between QA Example and QA Example",
    startTime: "2025-05-12T04:30:00Z",
    endTime: "2025-05-12T04:45:00Z",
    type: "e2e-test-team-event",
    organizer: {
      id: userId,
      name: "QA Example",
      email: "qa@example.com",
      username: "qa",
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

export async function cleanUpIntegrationTestChangesForTestUser() {
  if (testScheduleId !== -1) {
    await prisma.schedule.delete({
      where: {
        id: testScheduleId,
      },
    });
  }
  if (testSelectedCalendarId !== "") {
    await prisma.selectedCalendar.delete({
      where: {
        id: testSelectedCalendarId,
      },
    });
  }
  if (testDestinationCalendarId !== -1) {
    await prisma.destinationCalendar.delete({
      where: {
        id: testDestinationCalendarId,
      },
    });
  }
  if (testTeamId !== -1) {
    await prisma.team.delete({
      where: {
        id: testTeamId,
      },
    });
  }
}

async function fetchTokensAndCreateCredential(userId: number) {
  const email = process.env.E2E_TEST_OUTLOOK_CALENDAR_EMAIL;
  const password = process.env.E2E_TEST_OUTLOOK_CALENDAR_PASSWORD;

  test.skip(!email || !password, "Not able to install outlook calendar");

  let credential: CredentialForCalendarServiceWithTenantId | undefined = undefined;

  try {
    if (email && password && client_id && client_secret && tenant_id) {
      const scopes = ["User.Read", "Calendars.Read", "Calendars.ReadWrite", "offline_access"];

      const tokenEndpoint = `https://login.microsoftonline.com/${tenant_id}/oauth2/v2.0/token`;

      const body = new URLSearchParams({
        client_id,
        scope: scopes.join(" "),
        username: email,
        password,
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

export const outlookCalendarExternalId = "mock_outlook_external_id_1";
export async function setUpTestUserWithOutlookCalendar(users: ReturnType<typeof createUsersFixture>) {
  const integration = "office365_calendar";
  const email = "testCal@outlook.com";
  const appSlug = "office365-calendar";

  const testUser = await users.create(null, {
    hasTeam: true,
    schedulingType: SchedulingType.ROUND_ROBIN,
    teamEventLength: 120,
  });

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
      externalId: outlookCalendarExternalId,
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
      externalId: outlookCalendarExternalId,
      primaryEmail: email,
      credential: {
        connect: {
          id: credential.id,
        },
      },
    },
  });

  return credential;
}
