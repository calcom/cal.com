import {
  createCredentials,
  addTeamsToDb,
  addEventTypesToDb,
  addUsersToDb,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";

import { describe, test, expect, vi } from "vitest";

import { UserRepository } from "@calcom/features/users/repositories/UserRepository";

vi.mock("@calcom/features/users/repositories/UserRepository", () => {
  return {
    UserRepository: vi.fn().mockImplementation(function () {
      return {
        enrichUserWithItsProfile: vi.fn(),
      };
    }),
  };
});

describe("getAllCredentialsIncludeServiceAccountKey", () => {
  test("Get an individual's credentials", async () => {
    const mockEnrichUserWithItsProfile = vi.fn().mockReturnValue({
      profile: null,
    });

    const mockUserRepository = vi.mocked(UserRepository);
    if (mockUserRepository && typeof mockUserRepository.mockImplementation === "function") {
      mockUserRepository.mockImplementation(function () {
        return {
          enrichUserWithItsProfile: mockEnrichUserWithItsProfile,
        } as InstanceType<typeof UserRepository>;
      });
    }

    const getAllCredentialsIncludeServiceAccountKey = (await import("./getAllCredentials"))
      .getAllCredentialsIncludeServiceAccountKey;

    const userCredential = {
      id: 1,
      type: "user-credential",
      userId: 1,
      teamId: null,
      key: {},
      appId: "user-credential",
      invalid: false,
    };
    await createCredentials([
      userCredential,
      { type: "other-user-credential", userId: 2, key: {} },
      { type: "team-credential", teamId: 1, key: {} },
    ]);

    const credentials = await getAllCredentialsIncludeServiceAccountKey(
      {
        id: 1,
        username: "test",
        credentials: [{ ...userCredential, user: { email: "test@test.com" } }],
      },
      {
        userId: 1,
        team: null,
        parentId: null,
        metadata: {},
      }
    );

    expect(credentials).toHaveLength(1);

    expect(credentials).toContainEqual(expect.objectContaining({ type: "user-credential" }));
  });

  describe("Handle CRM credentials", () => {
    describe("If CRM is enabled on the event type", () => {
      describe("With _crm credentials", () => {
        test("For users", async () => {
          const mockEnrichUserWithItsProfile = vi.fn().mockReturnValue({
            profile: null,
          });

          const mockUserRepository = vi.mocked(UserRepository);
          if (mockUserRepository && typeof mockUserRepository.mockImplementation === "function") {
            mockUserRepository.mockImplementation(function () {
              return {
                enrichUserWithItsProfile: mockEnrichUserWithItsProfile,
              } as InstanceType<typeof UserRepository>;
            });
          }

          const getAllCredentialsIncludeServiceAccountKey = (await import("./getAllCredentials"))
            .getAllCredentialsIncludeServiceAccountKey;

          const crmCredential = {
            id: 1,
            type: "salesforce_crm",
            userId: 1,
            teamId: null,
            key: {},
            appId: "salesforce",
            invalid: false,
          };

          const otherCredential = {
            id: 2,
            type: "other_credential",
            userId: 1,
            teamId: null,
            key: {},
            appId: "other",
            invalid: false,
          };

          await createCredentials([
            crmCredential,
            {
              type: "salesforce_crm",
              userId: 2,
              key: {},
            },
            {
              type: "salesforce_crm",
              teamId: 1,
              key: {},
            },
          ]);

          const credentials = await getAllCredentialsIncludeServiceAccountKey(
            {
              id: 1,
              username: "test",
              credentials: [
                { ...crmCredential, user: { email: "test@test.com" } },
                {
                  ...otherCredential,
                  user: { email: "test@test.com" },
                },
              ],
            },
            {
              userId: 1,
              team: null,
              parentId: null,
              metadata: {
                apps: {
                  salesforce: {
                    enabled: true,
                    credentialId: 1,
                    appCategories: ["crm"],
                  },
                },
              },
            }
          );

          expect(credentials).toHaveLength(2);

          expect(credentials).toContainEqual(expect.objectContaining({ userId: 1, type: "salesforce_crm" }));
        });
        test("For teams", async () => {
          const mockEnrichUserWithItsProfile = vi.fn().mockReturnValue({
            profile: null,
          });

          const mockUserRepository = vi.mocked(UserRepository);
          if (mockUserRepository && typeof mockUserRepository.mockImplementation === "function") {
            mockUserRepository.mockImplementation(function () {
              return {
                enrichUserWithItsProfile: mockEnrichUserWithItsProfile,
              } as InstanceType<typeof UserRepository>;
            });
          }

          const getAllCredentialsIncludeServiceAccountKey = (await import("./getAllCredentials"))
            .getAllCredentialsIncludeServiceAccountKey;

          const crmCredential = {
            id: 1,
            type: "salesforce_crm",
            userId: 1,
            teamId: null,
            key: {},
            appId: "salesforce",
            invalid: false,
          };

          await createCredentials([
            crmCredential,
            {
              type: "salesforce_crm",
              userId: 2,
              key: {},
            },
            {
              id: 3,
              type: "salesforce_crm",
              teamId: 1,
              key: {},
            },
            {
              type: "other_credential",
              teamId: 1,
              key: {},
            },
          ]);

          const credentials = await getAllCredentialsIncludeServiceAccountKey(
            {
              id: 1,
              username: "test",
              credentials: [{ ...crmCredential, user: { email: "test@test.com" } }],
            },
            {
              userId: null,
              team: {
                id: 1,
                parentId: null,
              },
              parentId: null,
              metadata: {
                apps: {
                  salesforce: {
                    enabled: true,
                    credentialId: 3,
                    appCategories: ["crm"],
                  },
                },
              },
            }
          );

          expect(credentials).toHaveLength(2);

          expect(credentials).toContainEqual(expect.objectContaining({ teamId: 1, type: "salesforce_crm" }));
        });
        test("For child of managed event type", async () => {
          const mockEnrichUserWithItsProfile = vi.fn().mockReturnValue({
            profile: null,
          });

          const mockUserRepository = vi.mocked(UserRepository);
          if (mockUserRepository && typeof mockUserRepository.mockImplementation === "function") {
            mockUserRepository.mockImplementation(function () {
              return {
                enrichUserWithItsProfile: mockEnrichUserWithItsProfile,
              } as InstanceType<typeof UserRepository>;
            });
          }

          const getAllCredentialsIncludeServiceAccountKey = (await import("./getAllCredentials"))
            .getAllCredentialsIncludeServiceAccountKey;

          const teamId = 1;
          const crmCredential = {
            id: 1,
            type: "salesforce_crm",
            userId: 1,
            teamId: null,
            key: {},
            appId: "salesforce",
            invalid: false,
          };

          await createCredentials([
            crmCredential,
            {
              type: "salesforce_crm",
              userId: 2,
              key: {},
            },
            {
              id: 3,
              type: "salesforce_crm",
              teamId,
              key: {},
            },
            {
              type: "other_credential",
              teamId,
              key: {},
            },
          ]);

          await addTeamsToDb([
            {
              id: teamId,
              name: "Test team",
              slug: "test-team",
            },
          ]);

          const testEventType = await addEventTypesToDb([
            {
              id: 3,
              title: "Test event type",
              slug: "test-event-type",
              length: 15,
              team: {
                connect: {
                  id: teamId,
                },
              },
            },
          ]);

          console.log(testEventType);

          const credentials = await getAllCredentialsIncludeServiceAccountKey(
            {
              id: 1,
              username: "test",
              credentials: [{ ...crmCredential, user: { email: "test@test.com" } }],
            },
            {
              userId: null,
              team: {
                id: 2,
                parentId: 1,
              },
              parentId: 3,
              metadata: {
                apps: {
                  salesforce: {
                    enabled: true,
                    credentialId: 3,
                    appCategories: ["crm"],
                  },
                },
              },
            }
          );

          expect(credentials).toHaveLength(2);

          expect(credentials).toContainEqual(expect.objectContaining({ teamId, type: "salesforce_crm" }));
        });
        test("For an org user", async () => {
          const getAllCredentialsIncludeServiceAccountKey = (await import("./getAllCredentials"))
            .getAllCredentialsIncludeServiceAccountKey;
          const orgId = 3;
          const mockEnrichUserWithItsProfile = vi.fn().mockReturnValue({
            profile: { organizationId: orgId },
          });

          const mockUserRepository = vi.mocked(UserRepository);
          if (mockUserRepository && typeof mockUserRepository.mockImplementation === "function") {
            mockUserRepository.mockImplementation(function () {
              return {
                enrichUserWithItsProfile: mockEnrichUserWithItsProfile,
              } as InstanceType<typeof UserRepository>;
            });
          }

          const crmCredential = {
            id: 1,
            type: "salesforce_crm",
            userId: 1,
            teamId: null,
            key: {},
            appId: "salesforce",
            invalid: false,
          };

          const otherCredential = {
            id: 2,
            type: "other_credential",
            userId: 1,
            teamId: null,
            key: {},
            appId: "other",
            invalid: false,
          };

          await createCredentials([
            crmCredential,
            {
              type: "salesforce_crm",
              userId: 2,
              key: {},
            },
            {
              id: 3,
              type: "salesforce_crm",
              teamId: orgId,
              key: {},
            },
            {
              type: "other_credential",
              teamId: orgId,
              key: {},
            },
          ]);

          await addTeamsToDb([
            {
              id: orgId,
              name: "Test team",
              slug: "test-team",
            },
          ]);

          await addUsersToDb([
            {
              id: 1,
              email: "test@test.com",
              username: "test",
              schedules: [],
              profiles: {
                create: [{ organizationId: orgId, uid: "MOCK_UID", username: "test" }],
              },
            },
          ]);

          const credentials = await getAllCredentialsIncludeServiceAccountKey(
            {
              id: 1,
              username: "test",
              credentials: [
                { ...crmCredential, user: { email: "test@test.com" } },
                {
                  ...otherCredential,
                  user: { email: "test@test.com" },
                },
              ],
            },
            {
              userId: 1,
              team: null,
              parentId: null,
              metadata: {
                apps: {
                  salesforce: {
                    enabled: true,
                    credentialId: 3,
                    appCategories: ["crm"],
                  },
                },
              },
            }
          );

          expect(credentials).toHaveLength(3);

          expect(credentials).toContainEqual(
            expect.objectContaining({ teamId: orgId, type: "salesforce_crm" })
          );
        });
      });
      describe("Default with _other_calendar credentials", () => {
        test("For users", async () => {
          const getAllCredentialsIncludeServiceAccountKey = (await import("./getAllCredentials"))
            .getAllCredentialsIncludeServiceAccountKey;

          const crmCredential = {
            id: 1,
            type: "salesforce_other_calendar",
            userId: 1,
            teamId: null,
            key: {},
            appId: "salesforce",
            invalid: false,
          };

          const otherCredential = {
            id: 2,
            type: "other_credential",
            userId: 1,
            teamId: null,
            key: {},
            appId: "other",
            invalid: false,
          };

          await createCredentials([
            crmCredential,
            {
              type: "salesforce_crm",
              userId: 2,
              key: {},
            },
            {
              type: "salesforce_crm",
              teamId: 1,
              key: {},
            },
          ]);

          const credentials = await getAllCredentialsIncludeServiceAccountKey(
            {
              id: 1,
              username: "test",
              credentials: [
                { ...crmCredential, user: { email: "test@test.com" } },
                {
                  ...otherCredential,
                  user: { email: "test@test.com" },
                },
              ],
            },
            {
              userId: 1,
              team: null,
              parentId: null,
              metadata: {
                apps: {},
              },
            }
          );

          expect(credentials).toHaveLength(2);

          expect(credentials).toContainEqual(
            expect.objectContaining({ userId: 1, type: "salesforce_other_calendar" })
          );
        });
        test("For teams", async () => {
          const getAllCredentialsIncludeServiceAccountKey = (await import("./getAllCredentials"))
            .getAllCredentialsIncludeServiceAccountKey;

          const crmCredential = {
            id: 1,
            type: "salesforce_crm",
            userId: 1,
            teamId: null,
            key: {},
            appId: "salesforce",
            invalid: false,
          };

          await createCredentials([
            crmCredential,
            {
              type: "salesforce_crm",
              userId: 2,
              key: {},
            },
            {
              id: 3,
              type: "salesforce_other_calendar",
              teamId: 1,
              key: {},
            },
            {
              type: "other_credential",
              teamId: 1,
              key: {},
            },
          ]);

          const credentials = await getAllCredentialsIncludeServiceAccountKey(
            {
              id: 1,
              username: "test",
              credentials: [{ ...crmCredential, user: { email: "test@test.com" } }],
            },
            {
              userId: null,
              team: {
                id: 1,
                parentId: null,
              },
              parentId: null,
              metadata: {
                apps: {},
              },
            }
          );

          expect(credentials).toHaveLength(2);

          expect(credentials).toContainEqual(
            expect.objectContaining({ teamId: 1, type: "salesforce_other_calendar" })
          );
        });
        test("For child of managed event type", async () => {
          const getAllCredentialsIncludeServiceAccountKey = (await import("./getAllCredentials"))
            .getAllCredentialsIncludeServiceAccountKey;

          const teamId = 1;
          const crmCredential = {
            id: 1,
            type: "salesforce_crm",
            userId: 1,
            teamId: null,
            key: {},
            appId: "salesforce",
            invalid: false,
          };

          await createCredentials([
            crmCredential,
            {
              type: "salesforce_crm",
              userId: 2,
              key: {},
            },
            {
              id: 3,
              type: "salesforce_other_calendar",
              teamId,
              key: {},
            },
            {
              type: "other_credential",
              teamId,
              key: {},
            },
          ]);

          await addTeamsToDb([
            {
              id: teamId,
              name: "Test team",
              slug: "test-team",
            },
          ]);

          const testEventType = await addEventTypesToDb([
            {
              id: 3,
              title: "Test event type",
              slug: "test-event-type",
              length: 15,
              team: {
                connect: {
                  id: teamId,
                },
              },
            },
          ]);

          console.log(testEventType);

          const credentials = await getAllCredentialsIncludeServiceAccountKey(
            {
              id: 1,
              username: "test",
              credentials: [{ ...crmCredential, user: { email: "test@test.com" } }],
            },
            {
              userId: null,
              team: {
                id: 2,
                parentId: 1,
              },
              parentId: 3,
              metadata: {
                apps: {},
              },
            }
          );

          expect(credentials).toHaveLength(2);

          expect(credentials).toContainEqual(
            expect.objectContaining({ teamId, type: "salesforce_other_calendar" })
          );
        });
        test("For an org user", async () => {
          const getAllCredentialsIncludeServiceAccountKey = (await import("./getAllCredentials"))
            .getAllCredentialsIncludeServiceAccountKey;
          const orgId = 3;
          const mockEnrichUserWithItsProfile = vi.fn().mockReturnValue({
            profile: { organizationId: orgId },
          });

          const mockUserRepository = vi.mocked(UserRepository);
          if (mockUserRepository && typeof mockUserRepository.mockImplementation === "function") {
            mockUserRepository.mockImplementation(function () {
              return {
                enrichUserWithItsProfile: mockEnrichUserWithItsProfile,
              } as InstanceType<typeof UserRepository>;
            });
          }

          const crmCredential = {
            id: 1,
            type: "salesforce_crm",
            userId: 1,
            teamId: null,
            key: {},
            appId: "salesforce",
            invalid: false,
          };

          const otherCredential = {
            id: 2,
            type: "other_credential",
            userId: 1,
            teamId: null,
            key: {},
            appId: "other",
            invalid: false,
          };

          await createCredentials([
            crmCredential,
            {
              type: "salesforce_crm",
              userId: 2,
              key: {},
            },
            {
              id: 3,
              type: "salesforce_other_calendar",
              teamId: orgId,
              key: {},
            },
            {
              type: "other_credential",
              teamId: orgId,
              key: {},
            },
          ]);

          await addTeamsToDb([
            {
              id: orgId,
              name: "Test team",
              slug: "test-team",
            },
          ]);

          await addUsersToDb([
            {
              id: 1,
              email: "test@test.com",
              username: "test",
              schedules: [],
              profiles: {
                create: [{ organizationId: orgId, uid: "MOCK_UID", username: "test" }],
              },
            },
          ]);

          const credentials = await getAllCredentialsIncludeServiceAccountKey(
            {
              id: 1,
              username: "test",
              credentials: [
                { ...crmCredential, user: { email: "test@test.com" } },
                {
                  ...otherCredential,
                  user: { email: "test@test.com" },
                },
              ],
            },
            {
              userId: 1,
              team: null,
              parentId: null,
              metadata: {
                apps: {},
              },
            }
          );

          expect(credentials).toHaveLength(3);

          expect(credentials).toContainEqual(
            expect.objectContaining({ teamId: orgId, type: "salesforce_other_calendar" })
          );
        });
      });
    });
  });
});
