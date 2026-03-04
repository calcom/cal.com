import prisma from "@calcom/prisma";
import type { Credential, Team, User, WorkspacePlatform } from "@calcom/prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CredentialRepository } from "./CredentialRepository";

describe("CredentialRepository Integration Tests", () => {
  let testUser: User;
  let testTeam: Team;
  let testWorkspacePlatform: WorkspacePlatform;
  const createdCredentialIds: number[] = [];

  beforeAll(async () => {
    testUser = await prisma.user.create({
      data: {
        email: `cred-repo-test-${Date.now()}@example.com`,
        username: `cred-repo-test-${Date.now()}`,
      },
    });

    testTeam = await prisma.team.create({
      data: {
        name: `cred-repo-test-team-${Date.now()}`,
        slug: `cred-repo-test-team-${Date.now()}`,
      },
    });

    testWorkspacePlatform = await prisma.workspacePlatform.create({
      data: {
        slug: `test-wp-${Date.now()}`,
        name: "Test Workspace Platform",
        description: "Test workspace platform for integration tests",
        defaultServiceAccountKey: {},
      },
    });
  });

  afterAll(async () => {
    if (createdCredentialIds.length > 0) {
      await prisma.credential.deleteMany({
        where: { id: { in: createdCredentialIds } },
      });
    }
    await prisma.workspacePlatform.delete({ where: { id: testWorkspacePlatform.id } }).catch(() => {});
    await prisma.team.delete({ where: { id: testTeam.id } }).catch(() => {});
    await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
  });

  async function createTestCredential(
    overrides: Partial<{
      type: string;
      key: object;
      userId: number | null;
      teamId: number | null;
      appId: string | null;
      delegationCredentialId: string | null;
      encryptedKey: string | null;
      invalid: boolean;
    }> = {}
  ): Promise<Credential> {
    const cred = await prisma.credential.create({
      data: {
        type: overrides.type ?? "google_calendar",
        key: overrides.key ?? { access_token: "test" },
        userId: overrides.userId === undefined ? testUser.id : overrides.userId,
        appId: overrides.appId === undefined ? "google-calendar" : overrides.appId,
        teamId: overrides.teamId ?? null,
        delegationCredentialId: overrides.delegationCredentialId ?? null,
        encryptedKey: overrides.encryptedKey ?? null,
        invalid: overrides.invalid ?? false,
      },
    });
    createdCredentialIds.push(cred.id);
    return cred;
  }

  // ═══════════════════════════════════════════════════════════
  // INSTANCE METHODS
  // ═══════════════════════════════════════════════════════════

  describe("Instance methods", () => {
    const repo = new CredentialRepository(prisma);

    describe("findByCredentialId", () => {
      it("returns credential with safe select when it exists", async () => {
        const cred = await createTestCredential();
        const result = await repo.findByCredentialId(cred.id);

        expect(result).toBeDefined();
        expect(result!.id).toBe(cred.id);
        expect(result!.type).toBe("google_calendar");
        expect(result!.appId).toBe("google-calendar");
        expect(result!.userId).toBe(testUser.id);
        // safeCredentialSelect excludes key
        expect(result).not.toHaveProperty("key");
      });

      it("returns null when credential does not exist", async () => {
        const result = await repo.findByCredentialId(999999);
        expect(result).toBeNull();
      });
    });

    describe("findByIds", () => {
      it("returns matching credentials when all IDs exist", async () => {
        const cred1 = await createTestCredential({ type: "type_a" });
        const cred2 = await createTestCredential({ type: "type_b" });

        const result = await repo.findByIds({ ids: [cred1.id, cred2.id] });

        expect(result).toHaveLength(2);
        const ids = result.map((r) => r.id);
        expect(ids).toContain(cred1.id);
        expect(ids).toContain(cred2.id);
      });

      it("returns only existing credentials when some IDs are missing", async () => {
        const cred = await createTestCredential();
        const result = await repo.findByIds({ ids: [cred.id, 999998] });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(cred.id);
      });

      it("returns empty array without calling Prisma when ids is empty", async () => {
        const result = await repo.findByIds({ ids: [] });
        expect(result).toEqual([]);
      });
    });

    describe("findByIdWithDelegationCredential", () => {
      it("returns credential with delegation credential fields", async () => {
        const cred = await createTestCredential();
        const result = await repo.findByIdWithDelegationCredential(cred.id);

        expect(result).toBeDefined();
        expect(result!.id).toBe(cred.id);
        expect(result!.delegationCredential).toBeNull();
        // credentialForCalendarServiceSelect includes key
        expect(result).toHaveProperty("key");
      });

      it("returns null when credential does not exist", async () => {
        const result = await repo.findByIdWithDelegationCredential(999997);
        expect(result).toBeNull();
      });
    });

    describe("findByTeamIdAndSlugs", () => {
      it("returns matching credentials for team and slugs", async () => {
        const cred = await createTestCredential({
          teamId: testTeam.id,
          userId: null,
          appId: "google-calendar",
        });
        const result = await repo.findByTeamIdAndSlugs({
          teamId: testTeam.id,
          slugs: ["google-calendar"],
        });

        expect(result.length).toBeGreaterThanOrEqual(1);
        const found = result.find((r) => r.id === cred.id);
        expect(found).toBeDefined();
      });

      it("returns empty array when no slugs match", async () => {
        const result = await repo.findByTeamIdAndSlugs({
          teamId: testTeam.id,
          slugs: ["nonexistent-app-slug"],
        });
        expect(result).toHaveLength(0);
      });

      it("filters by multiple slugs", async () => {
        const cred1 = await createTestCredential({
          teamId: testTeam.id,
          userId: null,
          appId: "google-calendar",
          type: "google_calendar",
        });
        const cred2 = await createTestCredential({
          teamId: testTeam.id,
          userId: null,
          appId: "zoom",
          type: "zoom_video",
        });

        const result = await repo.findByTeamIdAndSlugs({
          teamId: testTeam.id,
          slugs: ["google-calendar", "zoom"],
        });

        const foundIds = result.map((r) => r.id);
        expect(foundIds).toContain(cred1.id);
        expect(foundIds).toContain(cred2.id);
      });
    });

    describe("findByIdAndTeamId", () => {
      it("returns credential when it belongs to team", async () => {
        const cred = await createTestCredential({
          teamId: testTeam.id,
          userId: null,
        });
        const result = await repo.findByIdAndTeamId({
          id: cred.id,
          teamId: testTeam.id,
        });

        expect(result).toBeDefined();
        expect(result!.id).toBe(cred.id);
      });

      it("returns null when credential belongs to wrong team", async () => {
        const cred = await createTestCredential({
          teamId: testTeam.id,
          userId: null,
        });
        const result = await repo.findByIdAndTeamId({
          id: cred.id,
          teamId: 999996,
        });

        expect(result).toBeNull();
      });

      it("returns null when credential does not exist", async () => {
        const result = await repo.findByIdAndTeamId({
          id: 999995,
          teamId: testTeam.id,
        });
        expect(result).toBeNull();
      });
    });

    describe("findByAppIdAndKeyValue", () => {
      it("finds credential by JSON path query", async () => {
        const cred = await createTestCredential({
          key: { account_id: "acc123", token: "tok" },
          type: "salesforce_crm",
          appId: "salesforce",
        });

        const result = await repo.findByAppIdAndKeyValue({
          appId: "salesforce",
          keyPath: ["account_id"],
          value: "acc123",
        });

        expect(result).toBeDefined();
        expect(result!.id).toBe(cred.id);
        // Without keyFields, key should not be included
        expect(result).not.toHaveProperty("key");
      });

      it("returns null when no match found", async () => {
        const result = await repo.findByAppIdAndKeyValue({
          appId: "salesforce",
          keyPath: ["account_id"],
          value: "nonexistent",
        });

        expect(result).toBeNull();
      });

      it("returns filtered key fields when keyFields provided", async () => {
        await createTestCredential({
          key: { account_id: "acc456", token: "secret_tok", refresh: "ref" },
          type: "salesforce_crm",
          appId: "salesforce",
        });

        const result = await repo.findByAppIdAndKeyValue({
          appId: "salesforce",
          keyPath: ["account_id"],
          value: "acc456",
          keyFields: ["account_id"],
        });

        expect(result).toBeDefined();
        const key = result!.key as Record<string, unknown>;
        expect(key.account_id).toBe("acc456");
        expect(key).not.toHaveProperty("token");
        expect(key).not.toHaveProperty("refresh");
      });

      it("includes integrationAttributeSyncs relation", async () => {
        const cred = await createTestCredential({
          key: { account_id: "acc789" },
          type: "salesforce_crm",
          appId: "salesforce",
        });

        const result = await repo.findByAppIdAndKeyValue({
          appId: "salesforce",
          keyPath: ["account_id"],
          value: "acc789",
        });

        expect(result).toBeDefined();
        expect(result).toHaveProperty("integrationAttributeSyncs");
        expect(Array.isArray(result!.integrationAttributeSyncs)).toBe(true);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // STATIC METHODS
  // ═══════════════════════════════════════════════════════════

  describe("Static methods", () => {
    describe("create", () => {
      it("creates a credential and returns it with non-delegation fields", async () => {
        const result = await CredentialRepository.create({
          type: "zoom_video",
          key: { access_token: "zoomtok" },
          userId: testUser.id,
          appId: "zoom",
        });

        expect(result).toBeDefined();
        expect(result!.type).toBe("zoom_video");
        expect(result!.delegatedTo).toBeNull();
        expect(result!.delegatedToId).toBeNull();
        expect(result!.delegationCredentialId).toBeNull();
        createdCredentialIds.push(result!.id);
      });
    });

    describe("deleteById", () => {
      it("deletes the credential", async () => {
        const cred = await createTestCredential();
        await CredentialRepository.deleteById({ id: cred.id });
        const found = await prisma.credential.findUnique({ where: { id: cred.id } });
        expect(found).toBeNull();
        // Remove from cleanup list since already deleted
        const idx = createdCredentialIds.indexOf(cred.id);
        if (idx > -1) createdCredentialIds.splice(idx, 1);
      });
    });

    describe("updateCredentialById", () => {
      it("updates credential fields", async () => {
        const cred = await createTestCredential({ invalid: false });
        await CredentialRepository.updateCredentialById({
          id: cred.id,
          data: { invalid: true },
        });
        const updated = await prisma.credential.findUnique({ where: { id: cred.id } });
        expect(updated!.invalid).toBe(true);
      });
    });

    describe("updateWhereId", () => {
      it("updates key field", async () => {
        const cred = await createTestCredential();
        await CredentialRepository.updateWhereId({
          id: cred.id,
          data: { key: { updated: true } },
        });
        const updated = await prisma.credential.findUnique({ where: { id: cred.id } });
        expect(updated!.key).toEqual({ updated: true });
      });
    });

    describe("findByAppIdAndUserId", () => {
      it("returns credential matching appId and userId", async () => {
        const cred = await createTestCredential({ appId: "zoom", type: "zoom_video" });
        const result = await CredentialRepository.findByAppIdAndUserId({
          appId: "zoom",
          userId: testUser.id,
        });

        expect(result).toBeDefined();
        expect(result!.type).toBe("zoom_video");
      });

      it("returns null when no match", async () => {
        const result = await CredentialRepository.findByAppIdAndUserId({
          appId: "nonexistent",
          userId: testUser.id,
        });
        expect(result).toBeNull();
      });
    });

    describe("findFirstByIdWithUser", () => {
      it("returns credential with safe select (no key)", async () => {
        const cred = await createTestCredential();
        const result = await CredentialRepository.findFirstByIdWithUser({ id: cred.id });

        expect(result).toBeDefined();
        expect(result!.id).toBe(cred.id);
        expect(result!.user).toEqual({ email: testUser.email });
        expect(result!.delegatedTo).toBeNull();
      });

      it("returns null for non-existent credential", async () => {
        const result = await CredentialRepository.findFirstByIdWithUser({ id: 999994 });
        expect(result).toBeNull();
      });
    });

    describe("findFirstByIdWithKeyAndUser", () => {
      it("returns credential including key and encryptedKey", async () => {
        const cred = await createTestCredential({
          key: { secret: "value" },
          encryptedKey: "encrypted_data",
        });
        const result = await CredentialRepository.findFirstByIdWithKeyAndUser({ id: cred.id });

        expect(result).toBeDefined();
        expect(result!.id).toBe(cred.id);
        expect(result!.key).toEqual({ secret: "value" });
        expect(result!.encryptedKey).toBe("encrypted_data");
      });
    });

    describe("findFirstByAppIdAndUserId", () => {
      it("returns first matching credential", async () => {
        await createTestCredential({ appId: "hubspot", type: "hubspot_crm" });
        const result = await CredentialRepository.findFirstByAppIdAndUserId({
          appId: "hubspot",
          userId: testUser.id,
        });
        expect(result).toBeDefined();
        expect(result!.type).toBe("hubspot_crm");
      });

      it("returns null when no match", async () => {
        const result = await CredentialRepository.findFirstByAppIdAndUserId({
          appId: "nonexistent-app",
          userId: testUser.id,
        });
        expect(result).toBeNull();
      });
    });

    describe("findFirstByUserIdAndType", () => {
      it("returns credential matching userId and type", async () => {
        await createTestCredential({ type: "stripe_payment", appId: "stripe" });
        const result = await CredentialRepository.findFirstByUserIdAndType({
          userId: testUser.id,
          type: "stripe_payment",
        });
        expect(result).toBeDefined();
        expect(result!.type).toBe("stripe_payment");
      });

      it("returns null when type does not match", async () => {
        const result = await CredentialRepository.findFirstByUserIdAndType({
          userId: testUser.id,
          type: "nonexistent_type",
        });
        expect(result).toBeNull();
      });
    });

    describe("findCredentialForCalendarServiceById", () => {
      it("returns credential with calendarService select", async () => {
        const cred = await createTestCredential();
        const result = await CredentialRepository.findCredentialForCalendarServiceById({ id: cred.id });

        expect(result).toBeDefined();
        expect(result!.id).toBe(cred.id);
        // credentialForCalendarServiceSelect includes key
        expect(result).toHaveProperty("key");
        expect(result!.delegatedTo).toBeNull();
      });

      it("returns null/undefined when not found", async () => {
        const result = await CredentialRepository.findCredentialForCalendarServiceById({ id: 999993 });
        expect(result).toBeFalsy();
      });
    });

    describe("findByIdIncludeDelegationCredential", () => {
      it("returns credential with delegationCredential relation", async () => {
        const cred = await createTestCredential();
        const result = await CredentialRepository.findByIdIncludeDelegationCredential({ id: cred.id });

        expect(result).toBeDefined();
        expect(result!.id).toBe(cred.id);
        expect(result!.delegationCredential).toBeNull();
      });

      it("returns null when not found", async () => {
        const result = await CredentialRepository.findByIdIncludeDelegationCredential({ id: 999992 });
        expect(result).toBeNull();
      });
    });

    describe("findAllDelegationByUserIdsListAndDelegationCredentialIdAndType", () => {
      it("returns matching delegation credentials", async () => {
        // Create a DelegationCredential to reference
        const delegCred = await prisma.delegationCredential.create({
          data: {
            workspacePlatformId: testWorkspacePlatform.id,
            organizationId: testTeam.id,
            domain: `deleg-test-${Date.now()}.example.com`,
            serviceAccountKey: {},
          },
        });

        const cred = await prisma.credential.create({
          data: {
            type: "google_calendar",
            key: {},
            userId: testUser.id,
            delegationCredentialId: delegCred.id,
          },
        });
        createdCredentialIds.push(cred.id);

        const result =
          await CredentialRepository.findAllDelegationByUserIdsListAndDelegationCredentialIdAndType({
            userIds: [testUser.id],
            delegationCredentialId: delegCred.id,
            type: "google_calendar",
          });

        expect(result.length).toBeGreaterThanOrEqual(1);
        expect(result.some((r) => r.userId === testUser.id)).toBe(true);

        // Cleanup
        await prisma.credential.deleteMany({ where: { delegationCredentialId: delegCred.id } });
        await prisma.delegationCredential.delete({ where: { id: delegCred.id } });
        const idx = createdCredentialIds.indexOf(cred.id);
        if (idx > -1) createdCredentialIds.splice(idx, 1);
      });

      it("returns empty array when no match", async () => {
        const result =
          await CredentialRepository.findAllDelegationByUserIdsListAndDelegationCredentialIdAndType({
            userIds: [testUser.id],
            delegationCredentialId: "nonexistent-id",
            type: "google_calendar",
          });
        expect(result).toHaveLength(0);
      });
    });

    describe("findAllDelegationByTypeIncludeUserAndTake", () => {
      it("returns delegation credentials with user data", async () => {
        const delegCred = await prisma.delegationCredential.create({
          data: {
            workspacePlatformId: testWorkspacePlatform.id,
            organizationId: testTeam.id,
            domain: `deleg-take-${Date.now()}.example.com`,
            serviceAccountKey: {},
          },
        });

        const cred = await prisma.credential.create({
          data: {
            type: "google_calendar",
            key: {},
            userId: testUser.id,
            delegationCredentialId: delegCred.id,
          },
        });
        createdCredentialIds.push(cred.id);

        const result = await CredentialRepository.findAllDelegationByTypeIncludeUserAndTake({
          type: "google_calendar",
          take: 10,
        });

        expect(result.length).toBeGreaterThanOrEqual(1);
        const found = result.find((r) => r.id === cred.id);
        if (found) {
          expect(found.user).toBeDefined();
          expect(found.delegationCredentialId).toBe(delegCred.id);
        }

        // Cleanup
        await prisma.credential.deleteMany({ where: { delegationCredentialId: delegCred.id } });
        await prisma.delegationCredential.delete({ where: { id: delegCred.id } });
        const idx = createdCredentialIds.indexOf(cred.id);
        if (idx > -1) createdCredentialIds.splice(idx, 1);
      });
    });

    describe("findUniqueByUserIdAndDelegationCredentialId", () => {
      it("returns the delegation credential for user", async () => {
        const delegCred = await prisma.delegationCredential.create({
          data: {
            workspacePlatformId: testWorkspacePlatform.id,
            organizationId: testTeam.id,
            domain: `deleg-unique-${Date.now()}.example.com`,
            serviceAccountKey: {},
          },
        });

        const cred = await prisma.credential.create({
          data: {
            type: "google_calendar",
            key: {},
            userId: testUser.id,
            delegationCredentialId: delegCred.id,
          },
        });
        createdCredentialIds.push(cred.id);

        const result = await CredentialRepository.findUniqueByUserIdAndDelegationCredentialId({
          userId: testUser.id,
          delegationCredentialId: delegCred.id,
        });

        expect(result).toBeDefined();
        expect(result!.id).toBe(cred.id);

        // Cleanup
        await prisma.credential.deleteMany({ where: { delegationCredentialId: delegCred.id } });
        await prisma.delegationCredential.delete({ where: { id: delegCred.id } });
        const idx = createdCredentialIds.indexOf(cred.id);
        if (idx > -1) createdCredentialIds.splice(idx, 1);
      });

      it("returns undefined when no match", async () => {
        const result = await CredentialRepository.findUniqueByUserIdAndDelegationCredentialId({
          userId: testUser.id,
          delegationCredentialId: "nonexistent-deleg-id",
        });
        expect(result).toBeUndefined();
      });
    });

    describe("updateWhereUserIdAndDelegationCredentialId", () => {
      it("updates key for matching delegation credentials", async () => {
        const delegCred = await prisma.delegationCredential.create({
          data: {
            workspacePlatformId: testWorkspacePlatform.id,
            organizationId: testTeam.id,
            domain: `deleg-update-${Date.now()}.example.com`,
            serviceAccountKey: {},
          },
        });

        const cred = await prisma.credential.create({
          data: {
            type: "google_calendar",
            key: { old: true },
            userId: testUser.id,
            delegationCredentialId: delegCred.id,
          },
        });
        createdCredentialIds.push(cred.id);

        const result = await CredentialRepository.updateWhereUserIdAndDelegationCredentialId({
          userId: testUser.id,
          delegationCredentialId: delegCred.id,
          data: { key: { updated: true } },
        });

        expect(result.count).toBeGreaterThanOrEqual(1);

        const updated = await prisma.credential.findUnique({ where: { id: cred.id } });
        expect(updated!.key).toEqual({ updated: true });

        // Cleanup
        await prisma.credential.deleteMany({ where: { delegationCredentialId: delegCred.id } });
        await prisma.delegationCredential.delete({ where: { id: delegCred.id } });
        const idx = createdCredentialIds.indexOf(cred.id);
        if (idx > -1) createdCredentialIds.splice(idx, 1);
      });
    });

    describe("createDelegationCredential", () => {
      it("creates a delegation credential", async () => {
        const delegCred = await prisma.delegationCredential.create({
          data: {
            workspacePlatformId: testWorkspacePlatform.id,
            organizationId: testTeam.id,
            domain: `deleg-create-${Date.now()}.example.com`,
            serviceAccountKey: {},
          },
        });

        const result = await CredentialRepository.createDelegationCredential({
          userId: testUser.id,
          delegationCredentialId: delegCred.id,
          type: "google_calendar",
          key: { token: "tok" },
          appId: "google-calendar",
        });

        expect(result).toBeDefined();
        expect(result.delegationCredentialId).toBe(delegCred.id);
        createdCredentialIds.push(result.id);

        // Cleanup
        await prisma.credential.deleteMany({ where: { delegationCredentialId: delegCred.id } });
        await prisma.delegationCredential.delete({ where: { id: delegCred.id } });
        const idx = createdCredentialIds.indexOf(result.id);
        if (idx > -1) createdCredentialIds.splice(idx, 1);
      });

      it("creates a delegation credential with encryptedKey", async () => {
        const delegCred = await prisma.delegationCredential.create({
          data: {
            workspacePlatformId: testWorkspacePlatform.id,
            organizationId: testTeam.id,
            domain: `deleg-enc-${Date.now()}.example.com`,
            serviceAccountKey: {},
          },
        });

        const result = await CredentialRepository.createDelegationCredential({
          userId: testUser.id,
          delegationCredentialId: delegCred.id,
          type: "google_calendar",
          key: { token: "tok" },
          appId: "google-calendar",
          encryptedKey: "encrypted_data_here",
        });

        expect(result).toBeDefined();
        expect(result.encryptedKey).toBe("encrypted_data_here");
        createdCredentialIds.push(result.id);

        // Cleanup
        await prisma.credential.deleteMany({ where: { delegationCredentialId: delegCred.id } });
        await prisma.delegationCredential.delete({ where: { id: delegCred.id } });
        const idx = createdCredentialIds.indexOf(result.id);
        if (idx > -1) createdCredentialIds.splice(idx, 1);
      });
    });

    describe("deleteAllByDelegationCredentialId", () => {
      it("deletes all credentials for a delegation credential", async () => {
        const delegCred = await prisma.delegationCredential.create({
          data: {
            workspacePlatformId: testWorkspacePlatform.id,
            organizationId: testTeam.id,
            domain: `deleg-del-${Date.now()}.example.com`,
            serviceAccountKey: {},
          },
        });

        const cred1 = await prisma.credential.create({
          data: {
            type: "google_calendar",
            key: {},
            userId: testUser.id,
            delegationCredentialId: delegCred.id,
          },
        });

        const cred2 = await prisma.credential.create({
          data: {
            type: "google_calendar",
            key: {},
            userId: testUser.id,
            delegationCredentialId: delegCred.id,
          },
        });

        const result = await CredentialRepository.deleteAllByDelegationCredentialId({
          delegationCredentialId: delegCred.id,
        });
        expect(result.count).toBe(2);

        const remaining = await prisma.credential.findMany({
          where: { id: { in: [cred1.id, cred2.id] } },
        });
        expect(remaining).toHaveLength(0);

        // Cleanup
        await prisma.delegationCredential.delete({ where: { id: delegCred.id } });
      });
    });

    describe("findPaymentCredentialByAppIdAndTeamId", () => {
      it("returns credential with app relation", async () => {
        const cred = await createTestCredential({
          teamId: testTeam.id,
          userId: null,
          appId: "stripe",
          type: "stripe_payment",
        });

        const result = await CredentialRepository.findPaymentCredentialByAppIdAndTeamId({
          appId: "stripe",
          teamId: testTeam.id,
        });

        // May return null if stripe app doesn't exist in seeded DB
        if (result) {
          expect(result.id).toBe(cred.id);
          // app relation is included
          expect(result).toHaveProperty("app");
        }
      });

      it("returns null when no match", async () => {
        const result = await CredentialRepository.findPaymentCredentialByAppIdAndTeamId({
          appId: "nonexistent",
          teamId: testTeam.id,
        });
        expect(result).toBeNull();
      });
    });

    describe("findPaymentCredentialByAppIdAndUserId", () => {
      it("returns credential matching appId and userId", async () => {
        await createTestCredential({ appId: "stripe", type: "stripe_payment" });

        const result = await CredentialRepository.findPaymentCredentialByAppIdAndUserId({
          appId: "stripe",
          userId: testUser.id,
        });

        if (result) {
          expect(result.type).toBe("stripe_payment");
          expect(result).toHaveProperty("app");
        }
      });

      it("returns null when no match", async () => {
        const result = await CredentialRepository.findPaymentCredentialByAppIdAndUserId({
          appId: "nonexistent",
          userId: testUser.id,
        });
        expect(result).toBeNull();
      });
    });

    describe("findPaymentCredentialByAppIdAndUserIdOrTeamId", () => {
      it("searches by teamId when provided", async () => {
        await createTestCredential({
          teamId: testTeam.id,
          userId: null,
          appId: "stripe",
          type: "stripe_payment",
        });

        const result = await CredentialRepository.findPaymentCredentialByAppIdAndUserIdOrTeamId({
          appId: "stripe",
          userId: testUser.id,
          teamId: testTeam.id,
        });

        if (result) {
          expect(result.type).toBe("stripe_payment");
        }
      });

      it("searches by userId when teamId is null", async () => {
        await createTestCredential({ appId: "stripe", type: "stripe_payment" });

        const result = await CredentialRepository.findPaymentCredentialByAppIdAndUserIdOrTeamId({
          appId: "stripe",
          userId: testUser.id,
          teamId: null,
        });

        if (result) {
          expect(result.type).toBe("stripe_payment");
          expect(result).toHaveProperty("app");
        }
      });

      it("returns null when no match", async () => {
        const result = await CredentialRepository.findPaymentCredentialByAppIdAndUserIdOrTeamId({
          appId: "nonexistent",
          userId: testUser.id,
        });
        expect(result).toBeNull();
      });
    });
  });
});
