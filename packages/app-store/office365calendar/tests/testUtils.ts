import { v4 as uuidv4 } from "uuid";

import Office365CalendarService from "@calcom/app-store/office365calendar/lib/CalendarService";
import { getTimeMax, getTimeMin } from "@calcom/features/calendar-cache/lib/datesForCache";
import { SERVICE_ACCOUNT_ENCRYPTION_KEY } from "@calcom/lib/constants";
import { symmetricEncrypt } from "@calcom/lib/crypto";
import { getTranslation } from "@calcom/lib/server/i18n";
import { TimeFormat } from "@calcom/lib/timeFormat";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { MembershipRole, SchedulingType } from "@calcom/prisma/client";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import type { CredentialForCalendarServiceWithTenantId } from "@calcom/types/Credential";
import { type createUsersFixture } from "@calcom/web/playwright/fixtures/users";
import { test } from "@calcom/web/playwright/lib/fixtures";

const integration = "office365_calendar";
const appSlug = "office365-calendar";
const client_id = process.env.E2E_TEST_OUTLOOK_CALENDAR_CLIENT_ID;
const client_secret = process.env.E2E_TEST_OUTLOOK_CALENDAR_CLIENT_KEY;
const tenant_id = process.env.E2E_TEST_OUTLOOK_CALENDAR_TENANT_ID;
const testUserEmail = process.env.E2E_TEST_OUTLOOK_CALENDAR_EMAIL;
let primaryCalendarExternalId: string | undefined = undefined;
let existingAppKeys: Prisma.JsonValue;
let workspacePlatformId = -1;
let eventsToDelete: string[] = [];

// Uses 'client_credentials' grant for real Microsoft Graph API authentication
async function getAccessToken() {
  if (client_id && client_secret && tenant_id) {
    try {
      const tokenEndpoint = `https://login.microsoftonline.com/${tenant_id}/oauth2/v2.0/token`;
      const body = new URLSearchParams({
        client_id,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
        client_secret,
      });
      const response = await fetch(tokenEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });
      if (!response.ok) {
        throw Error;
      }
      const data = await response.json();
      return data;
    } catch (err) {
      test.skip(true, "Not able to get access token");
    }
  }
}

// Create Credential with DelegatedCredential for real Office365CalendarService integration
// Uses 'client_credentials' grant type which is non-interactive, ideal for tests
// Skips the test if credentials are not available or if any error fetching tokens
async function fetchTokenAndCreateCredential(userId: number, orgId: number) {
  let credential: CredentialForCalendarServiceWithTenantId | undefined = undefined;

  try {
    if (testUserEmail && client_id && client_secret && tenant_id) {
      const data = await getAccessToken();
      if (data?.access_token) {
        const platformSlug = `office365`;
        const workspacePlatform = await prisma.workspacePlatform.create({
          data: {
            slug: platformSlug,
            name: `e2e-test-platform`,
            description: "",
            enabled: true,
            defaultServiceAccountKey: {
              tenant_id,
              client_id,
              private_key: client_secret,
            },
          },
        });
        workspacePlatformId = workspacePlatform.id;

        const delegationCredential = await prisma.delegationCredential.create({
          data: {
            workspacePlatform: {
              connect: {
                id: workspacePlatform.id,
              },
            },
            serviceAccountKey: {
              tenant_id,
              client_id,
              encrypted_credentials: symmetricEncrypt(
                JSON.stringify({ private_key: client_secret }),
                SERVICE_ACCOUNT_ENCRYPTION_KEY!
              ),
            },
            enabled: true,
            organization: {
              connect: {
                id: orgId,
              },
            },
            domain: testUserEmail.split("@")[1],
          },
        });

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
              delegationCredential: {
                connect: {
                  id: delegationCredential.id,
                },
              },
            },
            select: credentialForCalendarServiceSelect,
          })),
          delegatedTo: {
            serviceAccountKey: {
              tenant_id,
              client_id,
              private_key: client_secret,
            },
          },
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

// Install real Outlook Calendar integration for test user
export async function setUpTestUserForIntegrationTest(users: ReturnType<typeof createUsersFixture>) {
  let outlookCredential: CredentialForCalendarServiceWithTenantId | undefined = undefined;
  let destinationCalendar;
  let selectedCalendar;

  if (client_id && client_secret) {
    // Store existing app keys to restore after test
    const app = await prisma.app.findFirst({
      where: {
        slug: appSlug,
      },
    });
    if (app) existingAppKeys = app.keys;
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

  const orgSlug = `e2e-org-${uuidv4()}`;
  const testUser = await users.create(
    { email: testUserEmail, roleInOrganization: MembershipRole.ADMIN },
    {
      isOrg: true,
      orgRequestedSlug: orgSlug,
      isOrgVerified: true,
      isDnsSetup: true,
      hasTeam: true,
      hasSubteam: true,
      teamRole: MembershipRole.ADMIN,
      schedulingType: SchedulingType.ROUND_ROBIN,
      teamEventLength: 120,
      assignAllTeamMembers: true,
      assignAllTeamMembersForSubTeamEvents: true,
    }
  );
  const { team: org } = await testUser.getOrgMembership();
  const { team } = await testUser.getFirstTeamMembership();
  const teamEvent = await testUser.getFirstTeamEvent(team.id, SchedulingType.ROUND_ROBIN);
  const teamEventSlug = teamEvent.slug;

  outlookCredential = await fetchTokenAndCreateCredential(testUser.id, org.id);

  test.skip(!outlookCredential?.id, "Outlook QA credential not found");

  const outlookCalendarService = new Office365CalendarService(outlookCredential!);
  const calendars = await outlookCalendarService.listCalendars();
  const primaryCalendar = calendars.find((calendar) => calendar.primary);
  primaryCalendarExternalId = primaryCalendar?.externalId;

  test.skip(!primaryCalendar || !primaryCalendar.externalId, "Primary Calendar not found");

  if (primaryCalendarExternalId && outlookCredential) {
    selectedCalendar = await prisma.selectedCalendar.create({
      data: {
        user: {
          connect: {
            id: testUser.id,
          },
        },
        integration,
        externalId: primaryCalendarExternalId,
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
        externalId: primaryCalendarExternalId,
        primaryEmail: testUserEmail,
        credential: {
          connect: {
            id: outlookCredential.id,
          },
        },
      },
    });

    await prisma.teamFeatures.create({
      data: {
        teamId: team.id,
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
    teamEventSlug,
    teamSlug: team.slug,
    orgSlug,
    testUser,
  };
}

export async function createCacheKeyAndValue(externalId: string) {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const cacheKey = JSON.stringify({
    timeMin: getTimeMin(),
    timeMax: getTimeMax(),
    items: [{ id: externalId }],
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
  return { cacheKey, cacheValue: busyEvents };
}

// Creates real events in actual Microsoft Outlook Calendar via Graph API
export async function createOutlookCalendarEvents(credentialId: number, destinationCalendar: any, user: any) {
  const refreshedOutlookCredential = {
    ...(await prisma.credential.findFirstOrThrow({
      where: {
        id: credentialId,
      },
      select: credentialForCalendarServiceSelect,
    })),
    delegatedTo: {
      serviceAccountKey: {
        tenant_id,
        client_id,
        private_key: client_secret,
      },
    },
  } as CredentialForCalendarServiceWithTenantId;

  const outlookCalendarService = new Office365CalendarService(refreshedOutlookCredential);

  // Clean up any existing test events before creating new ones
  await deleteOutlookCalendarEvents();

  const tFunction = await getTranslation("en", "common");
  const baseEvent = {
    title: "E2E_TEST_TEAM_EVENT",
    type: "e2e-test-team-event",
    calendarDescription: "E2E test team event for Office365 calendar integration",
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

  const { cacheKey: expectedCacheKey, cacheValue: expectedCacheValue } = await createCacheKeyAndValue(
    destinationCalendar.externalId
  );

  // Create real events in Outlook calendar using Graph API
  for (const event of expectedCacheValue) {
    const createdEvent = await outlookCalendarService.createEvent(
      { ...baseEvent, startTime: event.start, endTime: event.end },
      credentialId
    );
    eventsToDelete.push(createdEvent.id);
  }

  return { expectedCacheKey, expectedCacheValue };
}

// Invokes real office365Calendar webhook to trigger fetchAvailabilityAndSetCache()
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
              "@odata.id": `Users/${testUserEmail}/Events/${externalId}`,
              "@odata.etag": 'W/"DwAAABYAAACZjeWCC/mnRbEM5y7oYy4AAAABxutl"',
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

// Deletes real events from actual Microsoft Outlook Calendar using batch API
export async function deleteOutlookCalendarEvents() {
  if (eventsToDelete.length === 0) return;
  const data = await getAccessToken();
  const requests = eventsToDelete.map((value, index) => ({
    id: index.toString(),
    method: "DELETE",
    url: `/users/${testUserEmail}/calendar/events/${value}`,
  }));
  const response = await fetch(`https://graph.microsoft.com/v1.0/$batch`, {
    method: "POST",
    body: JSON.stringify({ requests }),
    headers: {
      Authorization: `Bearer ${data.access_token}`,
      "Content-Type": "application/json",
    },
  });
  if (response.ok) {
    eventsToDelete = [];
  }
}

export async function cleanUpAfterIntegrationTest() {
  // Clean up test credentials to prevent manual usage affecting tests
  // The test account is intended to be used only by E2E tests
  await prisma.app.update({
    where: {
      slug: appSlug,
    },
    data: {
      keys: existingAppKeys ?? {},
    },
  });

  if (workspacePlatformId !== -1) {
    await prisma.workspacePlatform.delete({
      where: {
        id: workspacePlatformId,
      },
    });
  }
  await deleteOutlookCalendarEvents(); // delete events if test exits in between
}

// For Non-Integration Tests (mock-based)
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
