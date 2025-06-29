import prismock from "../../../../../tests/libs/__mocks__/prisma";

import { expect } from "vitest";

import { getTimeMax, getTimeMin } from "@calcom/features/calendar-cache/lib/datesForCache";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";
import type { CredentialForCalendarServiceWithTenantId } from "@calcom/types/Credential";

const outlookTestCredentialKey = {
  email: "",
  scope: "User.Read Calendars.Read Calendars.ReadWrite",
  token_type: "Bearer",
  expiry_date: 1625097600000,
  access_token: "",
  refresh_token: "",
  ext_expires_in: 3599,
};

const getSampleCredential = () => {
  return {
    invalid: false,
    key: outlookTestCredentialKey,
    type: "office365_calendar",
  };
};

export const testSelectedCalendar = {
  userId: 123,
  integration: "office365_calendar",
  externalId: "cal1",
};

function createInMemoryCredential({
  userId,
  delegationCredentialId,
  delegatedTo,
}: {
  userId: number;
  delegationCredentialId: string | null;
  delegatedTo: NonNullable<CredentialForCalendarServiceWithTenantId["delegatedTo"]>;
}) {
  return {
    id: -1,
    userId,
    key: {
      access_token: "NOOP_UNUSED_DELEGATION_TOKEN",
    },
    invalid: false,
    teamId: null,
    team: null,
    type: "office365_calendar",
    appId: "office365_calendar",
    delegatedToId: delegationCredentialId,
    delegatedTo: delegatedTo.serviceAccountKey
      ? {
          serviceAccountKey: delegatedTo.serviceAccountKey,
        }
      : null,
  };
}

export async function createCredentialForCalendarService({
  user = { email: "user@example.com" },
  delegatedTo = null,
  delegationCredentialId = null,
}: {
  user?: { email: string | null };
  delegatedTo?: NonNullable<CredentialForCalendarServiceWithTenantId["delegatedTo"]> | null;
  delegationCredentialId?: string | null;
} = {}): Promise<CredentialForCalendarServiceWithTenantId> {
  const defaultUser = await prismock.user.create({
    data: { email: user?.email ?? "" },
  });

  const app = await prismock.app.create({
    data: {
      slug: "office365_calendar",
      dirName: "office365_calendar",
    },
  });

  const credential = {
    ...getSampleCredential(),
    ...(delegationCredentialId ? { delegationCredential: { connect: { id: delegationCredentialId } } } : {}),
    key: {
      ...outlookTestCredentialKey,
      expiry_date: Date.now() - 1000,
    },
  };

  const credentialInDb = await prismock.credential.create({
    data: {
      ...credential,
      user: { connect: { id: defaultUser.id } },
      app: { connect: { slug: app.slug } },
    },
    include: { user: true },
  });

  return {
    ...credentialInDb,
    user: user ? { email: user.email ?? "" } : null,
    delegatedTo,
  } as CredentialForCalendarServiceWithTenantId;
}

export async function createSelectedCalendarForDelegationCredential(data: {
  userId: number;
  credentialId: number | null;
  delegationCredentialId: string;
  externalId: string;
  integration: string;
  outlookSubscriptionId: string | null;
  outlookSubscriptionExpiration: string | null;
}) {
  if (!data.delegationCredentialId) {
    throw new Error("delegationCredentialId is required");
  }
  return await prismock.selectedCalendar.create({ data });
}

export async function createSelectedCalendarForRegularCredential(data: {
  userId: number;
  delegationCredentialId: null;
  credentialId: number;
  externalId: string;
  integration: string;
  outlookSubscriptionId: string | null;
  outlookSubscriptionExpiration: string | null;
}) {
  if (!data.credentialId) {
    throw new Error("credentialId is required");
  }
  return await prismock.selectedCalendar.create({ data });
}

export const defaultDelegatedCredential = {
  serviceAccountKey: {
    client_id: "service-client-id",
    private_key: "service-private-key",
    tenant_id: "service-tenant-id",
  },
} as const;

export async function createDelegationCredentialForCalendarService({
  user,
  delegatedTo,
  delegationCredentialId,
}: {
  user?: { email: string } | null;
  delegatedTo?: typeof defaultDelegatedCredential;
  delegationCredentialId: string;
}) {
  return await createCredentialForCalendarService({
    user: user || {
      email: "service@example.com",
    },
    delegatedTo: delegatedTo || defaultDelegatedCredential,
    delegationCredentialId,
  });
}

export async function createDelegationCredentialForCalendarCache({
  user,
  delegatedTo,
  delegationCredentialId,
}: {
  user?: { email: string } | null;
  delegatedTo?: typeof defaultDelegatedCredential;
  delegationCredentialId: string;
}) {
  delegatedTo = delegatedTo || defaultDelegatedCredential;
  const credentialInDb = await createCredentialForCalendarService({
    user: user || {
      email: "service@example.com",
    },
  });

  return {
    ...createInMemoryCredential({
      userId: credentialInDb.userId!,
      delegationCredentialId,
      delegatedTo,
    }),
    ...credentialInDb,
  };
}

export async function expectCacheToBeNotSet({ credentialId }: { credentialId: number }) {
  const caches = await prismock.calendarCache.findMany({
    where: { credentialId },
  });
  expect(caches).toHaveLength(0);
}

export async function expectCacheToBeSet({
  credentialId,
  itemsInKey,
}: {
  credentialId: number;
  itemsInKey: { id: string }[];
}) {
  const caches = await prismock.calendarCache.findMany({
    where: { credentialId },
  });
  expect(caches).toHaveLength(1);
  expect(JSON.parse(caches[0].key)).toEqual(
    expect.objectContaining({
      items: itemsInKey,
    })
  );
}

export const calendarCacheHelpers = {
  FUTURE_EXPIRATION_DATE: new Date(Date.now() + 100000000),
  getDatePair: () => {
    const dateFrom = "2025-05-04T00:00:00Z";
    const dateTo = "2025-05-04T23:59:59Z";
    return { dateFrom, dateTo, minDateFrom: getTimeMin(dateFrom), maxDateTo: getTimeMax(dateTo) };
  },
  setCache: async ({
    credentialId,
    key,
    value,
    userId,
    expiresAt,
  }: {
    credentialId: number;
    key: string;
    value: string;
    userId: number | null;
    expiresAt: Date;
  }) => {
    //log.info("Setting Calendar Cache", safeStringify({ key, value, expiresAt, credentialId, userId }));
    await prismock.calendarCache.create({
      data: {
        key,
        value,
        expiresAt,
        credentialId,
        userId,
      },
    });
  },
};

export async function expectSelectedCalendarToHaveOutlookSubscriptionProps(
  id: string,
  outlookSubscriptionProps: {
    outlookSubscriptionId: string;
    outlookSubscriptionExpiration: string;
  }
) {
  const selectedCalendar = await SelectedCalendarRepository.findById(id);
  expect(selectedCalendar).toEqual(expect.objectContaining(outlookSubscriptionProps));
}

export async function expectSelectedCalendarToNotHaveOutlookSubscriptionProps(selectedCalendarId: string) {
  const selectedCalendar = await SelectedCalendarRepository.findFirst({
    where: { id: selectedCalendarId },
  });
  expect(selectedCalendar).toEqual(
    expect.objectContaining({
      outlookSubscriptionId: null,
      outlookSubscriptionExpiration: null,
    })
  );
}

export function expectOutlookSubscriptionToHaveOccurredAndClearMock(fetcherSpy: any) {
  expect(fetcherSpy).toHaveBeenCalledWith(
    "/subscriptions",
    expect.objectContaining({
      method: "POST",
      body: expect.stringContaining('"changeType":"created,updated,deleted"'),
    })
  );
  fetcherSpy.mockClear();
}

export function expectOutlookSubscriptionToNotHaveOccurredAndClearMock(fetcherSpy: any) {
  expect(fetcherSpy).not.toHaveBeenCalledWith("/subscriptions");
  fetcherSpy.mockClear();
}

export function expectOutlookUnsubscriptionToHaveOccurredAndClearMock(
  fetcherSpy: any,
  subscriptionIds: string[]
) {
  subscriptionIds.forEach((id) => {
    expect(fetcherSpy).toHaveBeenCalledWith(`/subscriptions/${id}`, { method: "DELETE" });
  });
  fetcherSpy.mockClear();
}

export function expectOutlookUnsubscriptionToNotHaveOccurredAndClearMock(fetcherSpy: any) {
  expect(fetcherSpy).not.toHaveBeenCalledWith(
    expect.stringContaining("/subscriptions"),
    expect.objectContaining({ method: "DELETE" })
  );
  fetcherSpy.mockClear();
}
