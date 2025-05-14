import prismock from "../../../../../../../tests/libs/__mocks__/prisma";

import { describe, it, expect, beforeEach, vi } from "vitest";

import { handleCreateSelectedCalendars } from "../route";

// Mock GoogleCalendarService
const fetchPrimaryCalendarMock = vi.fn();
vi.mock("@calcom/app-store/googlecalendar/lib/CalendarService", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      fetchPrimaryCalendar: fetchPrimaryCalendarMock,
    })),
  };
});

// Mock decryptServiceAccountKey to always return the expected object
vi.mock("@calcom/lib/server/serviceAccountKey", async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const actual = await importOriginal<any>();
  return {
    ...actual,
    decryptServiceAccountKey: vi.fn((input) => {
      // If input is a string, parse it; otherwise, return as is
      if (typeof input === "string") {
        try {
          return JSON.parse(input);
        } catch {
          return input;
        }
      }
      return input;
    }),
  };
});

// Helpers for test data setup
type OrgParams = { id?: number };
const createOrg = async ({ id = 1 }: OrgParams = {}) =>
  await prismock.team.create({ data: { id, name: `Org${id}`, isOrganization: true } });

type UserParams = { id?: number; email?: string };
const createUser = async ({ id = 1, email = `user${id}@example.com` }: UserParams = {}) =>
  await prismock.user.create({ data: { id, email } });

type WorkspacePlatformParams = { id?: number };
const createWorkspacePlatform = async ({ id = 1 }: WorkspacePlatformParams = {}) =>
  await prismock.workspacePlatform.create({
    data: {
      id,
      name: "Google",
      slug: "google",
      description: "Test platform",
      defaultServiceAccountKey: {},
    },
  });

type DelegationCredentialParams = { id?: string; orgId?: number; domain?: string };
const createDelegationCredential = async ({
  id = "delegation-credential-1",
  orgId = 1,
  domain = "example.com",
}: DelegationCredentialParams = {}) =>
  await prismock.delegationCredential.create({
    data: {
      id,
      enabled: true,
      domain,
      organizationId: orgId,
      workspacePlatformId: 1,
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

type SelectedCalendarParams = {
  userId?: number;
  externalId?: string;
  error?: string | null;
  id?: string;
  delegationCredentialId?: string;
  credentialId?: number;
};
const createSelectedCalendar = async ({
  userId = 1,
  externalId = "user1@example.com",
  error = null,
  id = `${userId}-sc`,
  delegationCredentialId = "delegation-credential-1",
  credentialId = 1,
}: SelectedCalendarParams = {}) =>
  await prismock.selectedCalendar.create({
    data: {
      id,
      integration: "google_calendar",
      externalId,
      userId,
      delegationCredentialId,
      credentialId,
      error,
    },
  });

describe("handleCreateSelectedCalendars integration", () => {
  beforeEach(() => {
    prismock.delegationCredential.deleteMany();
    prismock.credential.deleteMany();
    prismock.selectedCalendar.deleteMany();
    prismock.user.deleteMany();
    prismock.team.deleteMany();
    prismock.workspacePlatform.deleteMany();
    fetchPrimaryCalendarMock.mockReset();
  });

  it("shows a helpful message when no Delegation Credentials are set up in the system", async () => {
    const result = await handleCreateSelectedCalendars();
    expect(result).toEqual({
      message: "No delegation credentials found",
      success: 0,
      failures: 0,
    });
  });

  it("automatically creates a Selected Calendar for every eligible user when Delegation Credential is enabled and user matches domain", async () => {
    await createOrg({ id: 1 });
    await createWorkspacePlatform({ id: 1 });
    const user = await createUser({ id: 1, email: "user1@example.com" });
    const delegationCredential = await createDelegationCredential({
      id: "delegation-credential-1",
      orgId: 1,
      domain: "example.com",
    });
    await createCredential({ id: 1, userId: user.id, delegationCredentialId: delegationCredential.id });
    console.log({ credentials: await prismock.credential.findMany() });
    fetchPrimaryCalendarMock.mockResolvedValue({ id: "user1@example.com" });

    const result = await handleCreateSelectedCalendars();
    expect(result.success).toBe(1);
    expect(result.failures).toBe(0);
    const scs = await prismock.selectedCalendar.findMany({});
    expect(scs.length).toBe(1);
    expect(scs[0].externalId).toBe("user1@example.com");
  });

  it("creates a Selected Calendar even if the user's primary calendar ID does not match their email address", async () => {
    await createOrg({ id: 1 });
    await createWorkspacePlatform({ id: 1 });
    const user = await createUser({ id: 1, email: "user1@example.com" });
    const delegationCredential = await createDelegationCredential({
      id: "delegation-credential-1",
      orgId: 1,
      domain: "example.com",
    });
    await createCredential({ id: 1, userId: user.id, delegationCredentialId: delegationCredential.id });
    fetchPrimaryCalendarMock.mockResolvedValue({ id: "notuser@example.com" });

    const result = await handleCreateSelectedCalendars();
    expect(result.success).toBe(1);
    const scs = await prismock.selectedCalendar.findMany({});
    expect(scs.length).toBe(1);
    expect(scs[0].externalId).toBe("notuser@example.com");
  });

  it("does not create duplicate Selected Calendars for users who already have a valid one", async () => {
    await createOrg({ id: 1 });
    await createWorkspacePlatform({ id: 1 });
    const user = await createUser({ id: 1, email: "user1@example.com" });
    const delegationCredential = await createDelegationCredential({
      id: "delegation-credential-1",
      orgId: 1,
      domain: "example.com",
    });
    await createCredential({ id: 1, userId: user.id, delegationCredentialId: delegationCredential.id });
    await createSelectedCalendar({
      userId: user.id,
      externalId: "user1@example.com",
      delegationCredentialId: delegationCredential.id,
      credentialId: 1,
    });
    fetchPrimaryCalendarMock.mockResolvedValue({ id: "user1@example.com" });

    const result = await handleCreateSelectedCalendars();
    expect(result.success).toBe(0);
    const scs = await prismock.selectedCalendar.findMany({});
    expect(scs.length).toBe(1);
  });

  it("replaces a Selected Calendar if the existing one has an error, ensuring users always have a working calendar connection", async () => {
    await createOrg({ id: 1 });
    await createWorkspacePlatform({ id: 1 });
    const user = await createUser({ id: 1, email: "user1@example.com" });
    const delegationCredential = await createDelegationCredential({
      id: "delegation-credential-1",
      orgId: 1,
      domain: "example.com",
    });
    await createCredential({ id: 1, userId: user.id, delegationCredentialId: delegationCredential.id });
    await createSelectedCalendar({
      userId: user.id,
      externalId: "user1@example.com",
      error: "some error" as unknown as null,
      delegationCredentialId: delegationCredential.id,
      credentialId: 1,
    });
    fetchPrimaryCalendarMock.mockResolvedValue({ id: "user1@example.com" });

    const result = await handleCreateSelectedCalendars();
    expect(result.success).toBe(1);
    const scs = await prismock.selectedCalendar.findMany({});
    expect(scs.length).toBe(1);
    expect(scs[0].error).toBe(null);
  });
});
