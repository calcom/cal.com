import prismock from "../../../../../tests/libs/__mocks__/prisma";
import "@calcom/lib/__mocks__/logger";

import { describe, expect, it, vi, beforeEach } from "vitest";
import { z } from "zod";

import { TaskResultStatus } from "@calcom/features/tasker/tasker";

import { tasksConfig } from "..";
import { delegationCredentialSelectedCalendars } from "./createSelectedCalendars";

vi.mock("@calcom/lib/server/serviceAccountKey", () => ({
  serviceAccountKeySchema: z.any(),
  decryptServiceAccountKey: vi.fn((input) => ({
    ...input,
  })),
}));

let crashFetchPrimaryCalendarForUser: null | string = null;

// Mock GoogleCalendarService
vi.mock("@calcom/app-store/googlecalendar/lib/CalendarService", () => {
  return {
    default: class MockGoogleCalendarService {
      credential: any;
      constructor(credential: any) {
        this.credential = credential;
      }
      fetchPrimaryCalendar() {
        if (crashFetchPrimaryCalendarForUser === this.credential.user.email) {
          throw new Error("Failed to fetch calendar");
        }
        return { id: this.credential.user.email };
      }
    },
  };
});

async function createScenario({
  orgData,
  delegationCredentialData,
  membersData,
}: {
  orgData: {
    name: string;
    slug: string;
  };
  delegationCredentialData: {
    serviceAccountKey: {
      client_email: string;
      client_id: string;
      private_key: string;
    };
  };
  membersData: {
    user: {
      email: string;
    };
    accepted: boolean;
  }[];
}) {
  const org = await prismock.team.create({
    data: {
      ...orgData,
      isOrganization: true,
    },
  });

  await prismock.user.createMany({
    data: membersData.map((member) => ({
      email: member.user.email,
    })),
  });

  const allUsers = await prismock.user.findMany();

  const membersCreateManyData = membersData.map((member) => ({
    ...member,
    teamId: org.id,
    role: "MEMBER" as const,
    userId: allUsers.find((user) => user.email === member.user.email)?.id,
  }));

  await prismock.membership.createMany({
    data: membersCreateManyData,
  });

  const allMembers = await prismock.membership.findMany();
  const delegationCredential = await prismock.delegationCredential.create({
    data: {
      ...delegationCredentialData,
      organizationId: org.id,
      enabled: true,
      workspacePlatform: {
        create: {
          slug: "google",
          name: "Google",
          description: "Google",
        },
      },
    },
  });

  return {
    org,
    delegationCredential,
    members: allMembers,
  };
}

describe("delegationCredentialSelectedCalendars", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    crashFetchPrimaryCalendarForUser = null;
    // Clear the database
    // @ts-expect-error reset has missing type definition
    await prismock.reset();
  });

  describe("input validation", () => {
    it("should throw error for invalid JSON payload", async () => {
      await expect(delegationCredentialSelectedCalendars("invalid-json")).rejects.toThrow();
    });

    it("should throw error for missing delegationCredentialId", async () => {
      await expect(delegationCredentialSelectedCalendars("{}")).rejects.toThrow();
    });
  });

  describe("task execution", () => {
    it("should return NoWorkToDo when no accepted members found", async () => {
      // Setup test data
      const delegationCredential = await prismock.delegationCredential.create({
        data: {
          id: "test-delegation-id",
          enabled: true,
          organization: {
            create: {
              name: "Test Org",
              slug: "test-org",
              isOrganization: true,
            },
          },
        },
      });

      const result = await delegationCredentialSelectedCalendars(
        JSON.stringify({
          delegationCredentialId: delegationCredential.id,
        })
      );

      expect(result.status).toBe(TaskResultStatus.NoWorkToDo);
    });

    it("should return Completed when delegationCredential is disabled", async () => {
      // Setup test data
      const delegationCredential = await prismock.delegationCredential.create({
        data: {
          id: "test-delegation-id",
          enabled: false,
          organization: {
            create: {
              name: "Test Org",
              slug: "test-org",
              isOrganization: true,
            },
          },
        },
      });

      const result = await delegationCredentialSelectedCalendars(
        JSON.stringify({
          delegationCredentialId: delegationCredential.id,
        })
      );

      expect(result.status).toBe(TaskResultStatus.Completed);
    });

    it("should process members and create selected calendars", async () => {
      // Setup test data
      const { org, delegationCredential, members } = await createScenario({
        orgData: {
          name: "Test Org",
          slug: "test-org",
        },
        delegationCredentialData: {
          serviceAccountKey: {
            client_email: "test@example.com",
            client_id: "test-client-id",
            private_key: "test-private-key",
          },
        },
        membersData: [
          {
            user: {
              email: "test1@example.com",
            },
            accepted: true,
          },
          {
            user: {
              email: "test2@example.com",
            },
            accepted: true,
          },
          {
            user: {
              email: "test3@example.com",
            },
            accepted: true,
          },
        ],
      });

      const result = await delegationCredentialSelectedCalendars(
        JSON.stringify({
          delegationCredentialId: delegationCredential.id,
        })
      );

      const lastMembership = members[members.length - 1];
      // Verify results
      expect(result.status).toBe(TaskResultStatus.Progressing);
      expect(JSON.parse(result.newPayload!).lastMembershipId).toBe(lastMembership.id);

      // Verify selected calendar was created
      const selectedCalendars = await prismock.selectedCalendar.findMany();
      expect(selectedCalendars).toHaveLength(3);
      expect(selectedCalendars[0]).toMatchObject({
        userId: members[0].userId,
        integration: "google_calendar",
        externalId: "test1@example.com",
        delegationCredentialId: delegationCredential.id,
      });
      expect(selectedCalendars[1]).toMatchObject({
        userId: members[1].userId,
        integration: "google_calendar",
        externalId: "test2@example.com",
        delegationCredentialId: delegationCredential.id,
      });
      expect(selectedCalendars[2]).toMatchObject({
        userId: members[2].userId,
        integration: "google_calendar",
        externalId: "test3@example.com",
        delegationCredentialId: delegationCredential.id,
      });
    });

    it("should handle pagination correctly", async () => {
      const membersData: any[] = [];
      const take = tasksConfig.delegationCredentialSelectedCalendars?.take ?? 100;
      // Create 10 members more than the take limit(which is 100)
      for (let i = 1; i <= take + 10; i++) {
        membersData.push({
          user: {
            email: `test${i}@example.com`,
          },
          accepted: true,
        });
      }

      // Setup test data
      const { org, delegationCredential, members } = await createScenario({
        orgData: {
          name: "Test Org",
          slug: "test-org",
        },
        delegationCredentialData: {
          serviceAccountKey: {
            client_email: "test@example.com",
            client_id: "test-client-id",
            private_key: "test-private-key",
          },
        },
        membersData,
      });

      // First batch
      const result1: any = await delegationCredentialSelectedCalendars(
        JSON.stringify({
          delegationCredentialId: delegationCredential.id,
        })
      );

      const expectedLastMembershipProcessed = members[take - 1];

      expect(result1.status).toBe(TaskResultStatus.Progressing);
      const lastProcessedId1 = JSON.parse(result1.newPayload!).lastMembershipId;
      expect(lastProcessedId1).toBe(expectedLastMembershipProcessed.id);

      // Second batch
      const result2: any = await delegationCredentialSelectedCalendars(
        JSON.stringify({
          delegationCredentialId: delegationCredential.id,
          lastMembershipId: lastProcessedId1,
        })
      );

      const expectedLastMembershipProcessed2 = members[members.length - 1];
      expect(result2.status).toBe(TaskResultStatus.Progressing);
      const lastProcessedId2 = JSON.parse(result2.newPayload!).lastMembershipId;
      expect(lastProcessedId2).toBe(expectedLastMembershipProcessed2.id);

      // Third batch
      const result3: any = await delegationCredentialSelectedCalendars(
        JSON.stringify({
          delegationCredentialId: delegationCredential.id,
          lastMembershipId: lastProcessedId2,
        })
      );

      expect(result3.status).toBe(TaskResultStatus.NoWorkToDo);
      expect(result3.newPayload).toBeUndefined();
    });

    it("should skip creating selected calendar if it already exists", async () => {
      // Setup test data
      const { delegationCredential, members } = await createScenario({
        orgData: {
          name: "Test Org",
          slug: "test-org",
        },
        delegationCredentialData: {
          serviceAccountKey: {
            client_email: "test@example.com",
            client_id: "test-client-id",
            private_key: "test-private-key",
          },
        },
        membersData: [
          {
            user: {
              email: "test1@example.com",
            },
            accepted: true,
          },
        ],
      });

      const member = members[0];

      // Create existing selected calendar
      await prismock.selectedCalendar.create({
        data: {
          userId: member.userId,
          integration: "google_calendar",
          externalId: "existing-calendar",
          delegationCredentialId: delegationCredential.id,
        },
      });

      const result = await delegationCredentialSelectedCalendars(
        JSON.stringify({
          delegationCredentialId: delegationCredential.id,
        })
      );

      expect(result.status).toBe(TaskResultStatus.Progressing);
      expect(JSON.parse(result.newPayload!).lastMembershipId).toBe(member.id);

      // Verify no new calendar was created
      const selectedCalendars = await prismock.selectedCalendar.findMany();
      expect(selectedCalendars).toHaveLength(1);
      expect(selectedCalendars[0].externalId).toBe("existing-calendar");
    });

    it("should handle errors when fetching primary calendar", async () => {
      crashFetchPrimaryCalendarForUser = "test1@example.com";
      // Setup test data
      const { org, delegationCredential, members } = await createScenario({
        orgData: {
          name: "Test Org",
          slug: "test-org",
        },
        delegationCredentialData: {
          serviceAccountKey: {
            client_email: "test@example.com",
            client_id: "test-client-id",
            private_key: "test-private-key",
          },
        },
        membersData: [
          {
            user: {
              email: "test1@example.com",
            },
            accepted: true,
          },
          {
            user: {
              email: "test2@example.com",
            },
            accepted: true,
          },
        ],
      });

      const member = members[0];

      await prismock.credential.create({
        data: {
          userId: member.userId,
          type: "google_calendar",
          key: {
            delegatedTo: {
              serviceAccountKey: {
                client_email: "test@example.com",
              },
            },
          },
          delegationCredentialId: delegationCredential.id,
        },
      });

      const result = await delegationCredentialSelectedCalendars(
        JSON.stringify({
          delegationCredentialId: delegationCredential.id,
        })
      );

      // Verify test1@example.com calendar was not created - Because error
      const selectedCalendars = await prismock.selectedCalendar.findMany();
      expect(selectedCalendars).toHaveLength(1);
      // But test2@example.com calendar was created
      expect(selectedCalendars[0].externalId).toBe("test2@example.com");
      // Verify task continues despite error
      expect(result.status).toBe(TaskResultStatus.Progressing);
      expect(JSON.parse(result.newPayload!).lastMembershipId).toBe(members[1].id);
    });
  });
});
