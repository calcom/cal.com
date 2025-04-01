import prismock from "../../../tests/libs/__mocks__/prisma";

import { describe, test, expect, beforeEach, vi } from "vitest";
import { z } from "zod";

let googleCalendarServiceWatchCalendarLastCallArgs: any = null;
let googleCalendarServiceUnwatchCalendarLastCallArgs: any = null;
let calendarServiceCredential: any = null;

async function createUser({ email }: { email: string }) {
  return await prismock.user.create({
    data: { email },
  });
}

async function createOrganizationWithMember({ userId }: { userId: number }) {
  const org = await prismock.team.create({
    data: {
      name: "acme",
      members: {
        create: {
          user: {
            connect: {
              id: userId,
            },
          },
          role: "MEMBER",
        },
      },
    },
  });

  return { org };
}

async function createDelegationCredential() {
  return await prismock.delegationCredential.create({
    data: {
      domain: "acme.com",
      workspacePlatform: {
        create: {
          slug: "google",
          enabled: true,
        },
      },
    },
  });
}

async function createRegularGoogleCalendarCredential({ userId }: { userId: number }) {
  return await prismock.credential.create({
    data: {
      userId,
      type: "google_calendar",
      key: "{}",
    },
  });
}

function expectToBeDelegationCredential({
  credential,
  expected,
}: {
  credential: any;
  expected: { delegatedToId: string; email: string };
}) {
  expect(credential).toEqual(
    expect.objectContaining({
      delegatedToId: expected.delegatedToId,
      user: expect.objectContaining({
        email: expected.email,
      }),
    })
  );
}

function expectToBeRegularCredential({
  credential,
  expected,
}: {
  credential: any;
  expected: { id: number; email: string };
}) {
  expect(credential).toEqual(
    expect.objectContaining({
      id: expected.id,
      user: expect.objectContaining({ email: expected.email }),
    })
  );
}

vi.mock("@calcom/lib/server/serviceAccountKey", () => ({
  serviceAccountKeySchema: z.any(),
  decryptServiceAccountKey: vi.fn((input) => ({
    ...input,
  })),
}));

vi.mock("@calcom/googlecalendar", async () => {
  return {
    lib: {
      CalendarService: class MockCalendarService {
        constructor(private readonly credential: Credential) {
          calendarServiceCredential = credential;
        }
        watchCalendar = vi.fn((args: any) => {
          googleCalendarServiceWatchCalendarLastCallArgs = args;
        });
        unwatchCalendar = vi.fn((args: any) => {
          googleCalendarServiceUnwatchCalendarLastCallArgs = args;
        });
      },
    },
  };
});

async function enableFeature(slug: string) {
  return prismock.feature.create({
    data: {
      slug,
      enabled: true,
    },
  });
}

describe("CalendarCache", () => {
  beforeEach(async () => {
    googleCalendarServiceWatchCalendarLastCallArgs = null;
    googleCalendarServiceUnwatchCalendarLastCallArgs = null;
    calendarServiceCredential = null;
    await prismock.feature.deleteMany();
    vi.clearAllMocks();
    // Reset module side effects for calendar-cache, works only when dynamically importing calendar-cache
    // Side effect is that flag once found to be enabled is marked enabled in module memory
    vi.resetModules();
  });

  describe("Regular Credential - initFromCredentialId", () => {
    describe("watchCalendar", () => {
      test("should be able to call watchCalendar of CalendarService if calendar-cache feature is enabled", async () => {
        const { CalendarCache } = await import("./calendar-cache");
        const user1 = await createUser({ email: "user1@acme.com" });
        const credential = await createRegularGoogleCalendarCredential({ userId: user1.id });
        await enableFeature("calendar-cache");

        const calendarCache = await CalendarCache.initFromCredentialId(credential.id);
        expect(calendarCache).toBeDefined();
        calendarCache.watchCalendar({ calendarId: "calendarId", eventTypeIds: [] });
        expect(googleCalendarServiceWatchCalendarLastCallArgs).toEqual({
          calendarId: "calendarId",
          eventTypeIds: [],
        });
        expectToBeRegularCredential({
          credential: calendarServiceCredential,
          expected: { id: credential.id, email: user1.email },
        });
      });

      test("should not be able to call watchCalendar of CalendarService if calendar-cache feature is disabled", async () => {
        const { CalendarCache } = await import("./calendar-cache");

        const user1 = await createUser({ email: "user1@acme.com" });
        const credential = await createRegularGoogleCalendarCredential({ userId: user1.id });

        const calendarCache = await CalendarCache.initFromCredentialId(credential.id);
        expect(calendarCache).toBeDefined();

        calendarCache.watchCalendar({ calendarId: "calendarId", eventTypeIds: [] });
        expect(googleCalendarServiceWatchCalendarLastCallArgs).toBeNull();
      });
    });

    describe("unwatchCalendar", () => {
      test("should be able to call watchCalendar of CalendarService if calendar-cache feature is enabled", async () => {
        const { CalendarCache } = await import("./calendar-cache");

        const user1 = await createUser({ email: "user1@acme.com" });
        const credential = await createRegularGoogleCalendarCredential({ userId: user1.id });

        await enableFeature("calendar-cache");

        const calendarCache = await CalendarCache.initFromCredentialId(credential.id);
        expect(calendarCache).toBeDefined();
        calendarCache.unwatchCalendar({ calendarId: "calendarId", eventTypeIds: [] });
        expect(googleCalendarServiceUnwatchCalendarLastCallArgs).toEqual({
          calendarId: "calendarId",
          eventTypeIds: [],
        });
        expectToBeRegularCredential({
          credential: calendarServiceCredential,
          expected: { id: credential.id, email: user1.email },
        });
      });

      test("should not be able to call unwatchCalendar of CalendarService if calendar-cache feature is disabled", async () => {
        const { CalendarCache } = await import("./calendar-cache");

        const user1 = await createUser({ email: "user1@acme.com" });
        const credential = await createRegularGoogleCalendarCredential({ userId: user1.id });

        const calendarCache = await CalendarCache.initFromCredentialId(credential.id);
        expect(calendarCache).toBeDefined();

        calendarCache.unwatchCalendar({ calendarId: "calendarId", eventTypeIds: [] });
        expect(googleCalendarServiceUnwatchCalendarLastCallArgs).toBeNull();
      });
    });
  });

  describe("Delegation Credential - initFromDelegationCredentialId", () => {
    describe("watchCalendar", () => {
      test("should be able to call watchCalendar of CalendarService if calendar-cache feature is enabled", async () => {
        const { CalendarCache } = await import("./calendar-cache");

        const delegationCredential = await createDelegationCredential();

        const user1 = await createUser({ email: "user1@acme.com" });
        await createOrganizationWithMember({ userId: user1.id });

        await enableFeature("calendar-cache");

        const calendarCache = await CalendarCache.initFromDelegationCredentialId({
          delegationCredentialId: delegationCredential.id,
          userId: user1.id,
        });

        expectToBeDelegationCredential({
          credential: calendarServiceCredential,
          expected: {
            delegatedToId: delegationCredential.id,
            email: user1.email,
          },
        });

        calendarCache.watchCalendar({ calendarId: "calendarId", eventTypeIds: [] });
        expect(googleCalendarServiceWatchCalendarLastCallArgs).toEqual({
          calendarId: "calendarId",
          eventTypeIds: [],
        });
      });
    });
  });

  describe("initFromDelegationCredentialOrRegularCredential", () => {
    test("Regular Credential", async () => {
      const { CalendarCache } = await import("./calendar-cache");
      await enableFeature("calendar-cache");
      const user1 = await createUser({ email: "user1@acme.com" });
      const regularCredential = await createRegularGoogleCalendarCredential({ userId: user1.id });
      const calendarCache = await CalendarCache.initFromDelegationCredentialOrRegularCredential({
        delegationCredentialId: null,
        credentialId: regularCredential.id,
        userId: user1.id,
      });

      calendarCache.watchCalendar({ calendarId: "calendarId", eventTypeIds: [] });
      expect(googleCalendarServiceWatchCalendarLastCallArgs).toEqual({
        calendarId: "calendarId",
        eventTypeIds: [],
      });
      expectToBeRegularCredential({
        credential: calendarServiceCredential,
        expected: { id: regularCredential.id, email: user1.email },
      });
    });

    test("Delegation Credential", async () => {
      const { CalendarCache } = await import("./calendar-cache");
      await enableFeature("calendar-cache");
      const delegationCredential = await createDelegationCredential();
      const user1 = await createUser({ email: "user1@acme.com" });
      await createOrganizationWithMember({ userId: user1.id });

      const calendarCache = await CalendarCache.initFromDelegationCredentialOrRegularCredential({
        delegationCredentialId: delegationCredential.id,
        credentialId: null,
        userId: user1.id,
      });

      expect(calendarCache).toBeDefined();
      calendarCache.watchCalendar({ calendarId: "calendarId", eventTypeIds: [] });
      expect(googleCalendarServiceWatchCalendarLastCallArgs).toEqual({
        calendarId: "calendarId",
        eventTypeIds: [],
      });

      expectToBeDelegationCredential({
        credential: calendarServiceCredential,
        expected: { delegatedToId: delegationCredential.id, email: user1.email },
      });
    });
  });
});
