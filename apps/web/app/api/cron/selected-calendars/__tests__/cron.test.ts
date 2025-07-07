import prismock from "../../../../../../../tests/libs/__mocks__/prisma";
import "@calcom/lib/server/__mocks__/serviceAccountKey";

import { describe, it, expect, beforeEach, vi } from "vitest";

import { CalendarAppDelegationCredentialInvalidGrantError } from "@calcom/lib/CalendarAppError";

import { handleCreateSelectedCalendars, isSameEmail } from "../route";

// Mock GoogleCalendarService
const getPrimaryCalendarMock = vi.fn();
vi.mock("@calcom/app-store/googlecalendar/lib/CalendarService", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      getPrimaryCalendar: getPrimaryCalendarMock,
    })),
  };
});

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

type DelegationCredentialParams = { id: string; orgId: number; domain: string };
const createDelegationCredential = async ({ id, orgId, domain }: DelegationCredentialParams) =>
  await prismock.delegationCredential.create({
    data: {
      id,
      enabled: true,
      domain: domain ?? "example.com",
      organizationId: orgId ?? 1,
      workspacePlatformId: 1,
      serviceAccountKey: {
        client_email: "svc@example.com",
        private_key: "pk",
        client_id: "cid",
      },
    },
  });

type CredentialParams = {
  id: number;
  userId: number;
  delegationCredentialId: string | null;
  key?: object;
};
const createCredential = async ({ id, userId, delegationCredentialId, key = {} }: CredentialParams) =>
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
  delegationCredentialId?: string | null;
  credentialId?: number;
};
const createSelectedCalendar = async ({
  userId = 1,
  externalId = "user1@example.com",
  error = null,
  id = `${userId}-sc`,
  delegationCredentialId = null,
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

// Helper to assert selected calendars in DB match expected (partial, order-insensitive)
type PartialSelectedCalendar = Partial<Awaited<ReturnType<typeof prismock.selectedCalendar.create>>>;
async function expectSelectedCalendars(expected: PartialSelectedCalendar[]) {
  const actual = await prismock.selectedCalendar.findMany({});
  expect(actual.length).toBe(expected.length);
  expect(actual).toEqual(expect.arrayContaining(expected.map((exp) => expect.objectContaining(exp))));
}

describe("handleCreateSelectedCalendars integration", () => {
  beforeEach(() => {
    prismock.delegationCredential.deleteMany();
    prismock.credential.deleteMany();
    prismock.selectedCalendar.deleteMany();
    prismock.user.deleteMany();
    prismock.team.deleteMany();
    prismock.workspacePlatform.deleteMany();
    getPrimaryCalendarMock.mockReset();
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
    getPrimaryCalendarMock.mockResolvedValue({ id: "user1@example.com" });

    const result = await handleCreateSelectedCalendars();
    expect(result.success).toBe(1);
    expect(result.failures).toBe(0);
    await expectSelectedCalendars([
      { userId: user.id, externalId: "user1@example.com", delegationCredentialId: delegationCredential.id },
    ]);
  });

  describe("when the user's primary calendar ID does not match their email address", () => {
    it("creates a Selected Calendar with the primaryCalendarId as the externalId if user's email is not a plus based variant of primaryCalendarId", async () => {
      await createOrg({ id: 1 });
      await createWorkspacePlatform({ id: 1 });
      const user = await createUser({ id: 1, email: "user1@example.com" });
      const delegationCredential = await createDelegationCredential({
        id: "delegation-credential-1",
        orgId: 1,
        domain: "example.com",
      });
      await createCredential({ id: 1, userId: user.id, delegationCredentialId: delegationCredential.id });
      getPrimaryCalendarMock.mockResolvedValue({ id: "notuser@example.com" });

      const result = await handleCreateSelectedCalendars();
      expect(result.success).toBe(1);
      expect(result.failures).toBe(0);
      await expectSelectedCalendars([
        {
          userId: user.id,
          externalId: "notuser@example.com",
          delegationCredentialId: delegationCredential.id,
        },
      ]);
    });

    it("creates a Selected Calendar with the user's email as the externalId if user's email is a plus based variant of primaryCalendarId", async () => {
      await createOrg({ id: 1 });
      await createWorkspacePlatform({ id: 1 });
      const user = await createUser({ id: 1, email: "user1+test@example.com" });
      const delegationCredential = await createDelegationCredential({
        id: "delegation-credential-1",
        orgId: 1,
        domain: "example.com",
      });
      await createCredential({ id: 1, userId: user.id, delegationCredentialId: delegationCredential.id });
      getPrimaryCalendarMock.mockResolvedValue({ id: "user1@example.com" });

      const result = await handleCreateSelectedCalendars();
      expect(result.success).toBe(1);
      expect(result.failures).toBe(0);
      await expectSelectedCalendars([
        { userId: user.id, externalId: user.email, delegationCredentialId: delegationCredential.id },
      ]);
    });
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
    getPrimaryCalendarMock.mockResolvedValue({ id: "user1@example.com" });

    const result = await handleCreateSelectedCalendars();
    expect(result.success).toBe(0);
    await expectSelectedCalendars([
      { userId: user.id, externalId: "user1@example.com", delegationCredentialId: delegationCredential.id },
    ]);
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
    // Create a Delegation User Credential
    await createCredential({
      id: 2,
      userId: user.id,
      delegationCredentialId: delegationCredential.id,
    });
    // Create a Regular User Credential
    const regularCredential = await createCredential({
      id: 1,
      userId: user.id,
      delegationCredentialId: null,
    });
    // Create a SelectedCalendar attached to regular credential
    await createSelectedCalendar({
      userId: user.id,
      externalId: "user1@example.com",
      error: "some error" as unknown as null,
      credentialId: regularCredential.id,
    });
    getPrimaryCalendarMock.mockResolvedValue({ id: "user1@example.com" });

    const result = await handleCreateSelectedCalendars();
    expect(result.success).toBe(1);
    await expectSelectedCalendars([
      {
        userId: user.id,
        externalId: "user1@example.com",
        delegationCredentialId: delegationCredential.id,
        error: null,
      },
    ]);
  });

  describe("when GoogleCalendarService throws error", () => {
    it("creates SelectedCalendar with user.email when CalendarAppDelegationCredentialInvalidGrantError is thrown", async () => {
      await createOrg({ id: 1 });
      await createWorkspacePlatform({ id: 1 });
      const user = await createUser({ id: 1, email: "user1@example.com" });
      const delegationCredential = await createDelegationCredential({
        id: "delegation-credential-1",
        orgId: 1,
        domain: "example.com",
      });
      await createCredential({ id: 1, userId: user.id, delegationCredentialId: delegationCredential.id });
      getPrimaryCalendarMock.mockRejectedValue(
        new CalendarAppDelegationCredentialInvalidGrantError("some error")
      );

      const result = await handleCreateSelectedCalendars();
      expect(result.success).toBe(1);
      await expectSelectedCalendars([
        { userId: user.id, externalId: "user1@example.com", delegationCredentialId: delegationCredential.id },
      ]);
    });

    it("does not create SelectedCalendar when some other error than CalendarAppDelegationCredentialInvalidGrantError is thrown", async () => {
      await createOrg({ id: 1 });
      await createWorkspacePlatform({ id: 1 });
      const user = await createUser({ id: 1, email: "user1@example.com" });
      const delegationCredential = await createDelegationCredential({
        id: "delegation-credential-1",
        orgId: 1,
        domain: "example.com",
      });
      await createCredential({ id: 1, userId: user.id, delegationCredentialId: delegationCredential.id });
      getPrimaryCalendarMock.mockRejectedValue(new Error("some error"));

      const result = await handleCreateSelectedCalendars();
      expect(result.success).toBe(0);
      await expectSelectedCalendars([]);
    });
  });
});

describe("isSameEmail", () => {
  it("returns true if variant email is a plus based variant of main email", () => {
    expect(
      isSameEmail({
        mainEmail: "user1@example.com",
        variantEmail: "user1+test@example.com",
        emailProvider: "google",
      })
    ).toBe(true);
  });

  it("returns false if variant email is different from main email", () => {
    expect(
      isSameEmail({
        mainEmail: "user1@example.com",
        variantEmail: "user1@domain.com",
        emailProvider: "google",
      })
    ).toBe(false);
  });

  it("returns true if variant email is same as main email but with different casing", () => {
    expect(
      isSameEmail({
        mainEmail: "User1@example.com",
        variantEmail: "user1+test@Example.com",
        emailProvider: "google",
      })
    ).toBe(true);
  });
});
