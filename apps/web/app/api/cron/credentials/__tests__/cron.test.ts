import prismock from "@calcom/testing/lib/__mocks__/prisma";
import type { MembershipRole } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it } from "vitest";
import { handleCreateCredentials } from "../route";

type OrgParams = { id: number };
const createOrg = async ({ id }: OrgParams) =>
  await prismock.team.create({ data: { id, name: `Org${id}`, isOrganization: true } });

type UserParams = { id: number; email: string };
const createUser = async ({ id, email }: UserParams) => await prismock.user.create({ data: { id, email } });

type WorkspacePlatformParams = { id: number; name?: string; slug?: string; description?: string };
const createWorkspacePlatform = async ({ id, name, slug, description }: WorkspacePlatformParams) =>
  await prismock.workspacePlatform.create({
    data: {
      id,
      name: name ?? "Google",
      slug: slug ?? "google",
      description: description ?? "Test platform",
      defaultServiceAccountKey: {},
    },
  });

type DelegationCredentialParams = {
  id: string;
  orgId: number;
  domain: string;
  workspacePlatformId: number;
};

const createDelegationCredential = async ({
  id,
  orgId,
  domain,
  workspacePlatformId,
}: DelegationCredentialParams) =>
  await prismock.delegationCredential.create({
    data: {
      id,
      enabled: true,
      domain,
      organizationId: orgId,
      workspacePlatformId,
      serviceAccountKey: {
        client_email: "svc@example.com",
        private_key: "pk",
        client_id: "cid",
      },
    },
  });

type CredentialParams = { id?: number; userId?: number; delegationCredentialId?: string; key?: object };
const createCredential = async ({
  id = 1,
  userId = 1,
  delegationCredentialId = "delegation-credential-1",
  key = {},
}: CredentialParams = {}) =>
  await prismock.credential.create({
    data: {
      id,
      type: "google_calendar",
      key,
      userId,
      appId: "google_calendar",
      delegationCredentialId,
    },
  });

type MembershipParams = { teamId: number; userId: number; role?: MembershipRole };
const createMembership = async ({ teamId, userId, role = "MEMBER" }: MembershipParams) =>
  await prismock.membership.create({ data: { teamId, userId, accepted: true, role } });

// Helper to assert credentials in DB match expected (partial, order-insensitive)
type PartialCredential = Partial<Awaited<ReturnType<typeof prismock.credential.create>>>;
async function expectCredentials(expected: PartialCredential[]) {
  const actual = await prismock.credential.findMany({});
  expect(actual.length).toBe(expected.length);
  expect(actual).toEqual(expect.arrayContaining(expected.map((exp) => expect.objectContaining(exp))));
}

describe("Delegation Credentials: Organization-wide Google Calendar Access", () => {
  beforeEach(() => {
    prismock.delegationCredential.deleteMany();
    prismock.credential.deleteMany();
    prismock.user.deleteMany();
    prismock.team.deleteMany();
    prismock.workspacePlatform.deleteMany();
    prismock.membership.deleteMany();
  });

  it("shows a helpful message when no Delegation Credentials are enabled", async () => {
    const result = await handleCreateCredentials();
    expect(result).toEqual({
      message: "No enabled delegation credentials found",
      success: 0,
      failures: 0,
    });
    await expectCredentials([]);
  });

  it("creates credentials for all eligible organization members when Delegation Credential is enabled", async () => {
    const org = await createOrg({ id: 1 });
    const workspacePlatform = await createWorkspacePlatform({ id: 1 });
    const user1 = await createUser({ id: 1, email: "alice@example.com" });
    const user2 = await createUser({ id: 2, email: "bob@example.com" });
    await createMembership({ teamId: org.id, userId: user1.id });
    await createMembership({ teamId: org.id, userId: user2.id });
    await createDelegationCredential({
      id: "delegation-credential-1",
      orgId: org.id,
      domain: "example.com",
      workspacePlatformId: workspacePlatform.id,
    });

    const result = await handleCreateCredentials();
    expect(result.success).toBe(2);
    expect(result.failures).toBe(0);
    await expectCredentials([
      { userId: user1.id, delegationCredentialId: "delegation-credential-1", type: "google_calendar" },
      { userId: user2.id, delegationCredentialId: "delegation-credential-1", type: "google_calendar" },
    ]);
  });

  it("skips credential creation for unsupported workspace platforms", async () => {
    const org = await createOrg({ id: 1 });
    // Create a non-google workspace platform
    const outlookPlatform = await createWorkspacePlatform({
      id: 2,
      name: "Outlook",
      slug: "outlook",
      description: "Test",
    });
    const user = await createUser({ id: 1, email: "user1@outlook.com" });
    await createMembership({ teamId: org.id, userId: user.id });
    await createDelegationCredential({
      id: "delegation-credential-2",
      orgId: org.id,
      domain: "outlook.com",
      workspacePlatformId: outlookPlatform.id,
    });
    const result = await handleCreateCredentials();
    expect(result.success).toBe(0);
    await expectCredentials([]);
  });

  it("does not create duplicate credentials for users who already have one", async () => {
    const org = await createOrg({ id: 1 });
    const workspacePlatform = await createWorkspacePlatform({ id: 1 });
    const user = await createUser({ id: 1, email: "user1@example.com" });
    await createMembership({ teamId: org.id, userId: user.id });
    await createDelegationCredential({
      id: "delegation-credential-1",
      orgId: org.id,
      domain: "example.com",
      workspacePlatformId: workspacePlatform.id,
    });
    await createCredential({ id: 1, userId: user.id, delegationCredentialId: "delegation-credential-1" });
    const result = await handleCreateCredentials();
    expect(result.success).toBe(0);
    await expectCredentials([
      { userId: user.id, delegationCredentialId: "delegation-credential-1", type: "google_calendar" },
    ]);
  });

  it("processes only a batch of members at a time if there are more than the batch size", async () => {
    const org = await createOrg({ id: 1 });
    const workspacePlatform = await createWorkspacePlatform({
      id: 1,
      name: "Google",
      slug: "google",
      description: "Test platform",
    });
    // Simulate more than 100 delegated members
    const users = [];
    for (let i = 1; i <= 120; i++) {
      const user = await createUser({ id: i, email: `user${i}@example.com` });
      users.push(user);
      await createMembership({ teamId: org.id, userId: user.id });
    }
    await createDelegationCredential({
      id: "delegation-credential-1",
      orgId: org.id,
      domain: "example.com",
      workspacePlatformId: workspacePlatform.id,
    });
    const result = await handleCreateCredentials();
    expect(result.success).toBe(100); // Only batch size processed
    await expectCredentials(
      users.slice(0, 100).map((u) => ({
        userId: u.id,
        delegationCredentialId: "delegation-credential-1",
        type: "google_calendar",
      }))
    );
  });
});
