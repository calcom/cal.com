import prismock from "@calcom/testing/lib/__mocks__/prisma";
import { MOCK_JWT_TOKEN, setLastCreatedJWT } from "../__mocks__/googleapis";

import { JWT } from "googleapis-common";
import { vi } from "vitest";
import "vitest-fetch-mock";

import type { CredentialForCalendarServiceWithEmail } from "@calcom/types/Credential";

vi.stubEnv("GOOGLE_WEBHOOK_TOKEN", "test-webhook-token");

export function createInMemoryCredential({
  userId,
  delegationCredentialId,
  delegatedTo,
}: {
  userId: number;
  delegationCredentialId: string;
  delegatedTo: NonNullable<CredentialForCalendarServiceWithEmail["delegatedTo"]>;
}) {
  if (delegatedTo && !delegationCredentialId) {
    throw new Error("Test: createInMemoryCredential: delegationCredentialId is required");
  }
  return {
    id: -1,
    userId,
    key: {
      access_token: "NOOP_UNUSED_DELEGATION_TOKEN",
    },
    invalid: false,
    teamId: null,
    team: null,
    type: "google_calendar",
    appId: "google-calendar",
    delegatedToId: delegationCredentialId,
    delegatedTo: delegatedTo.serviceAccountKey
      ? {
          serviceAccountKey: delegatedTo.serviceAccountKey,
        }
      : null,
  };
}

export async function createCredentialForCalendarService({
  user = undefined,
  delegatedTo = null,
  delegationCredentialId = null,
}: {
  user?: { email: string | null };
  delegatedTo?: NonNullable<CredentialForCalendarServiceWithEmail["delegatedTo"]> | null;
  delegationCredentialId?: string | null;
} = {}): Promise<CredentialForCalendarServiceWithEmail> {
  const defaultUser = await prismock.user.create({
    data: {
      email: user?.email ?? "",
    },
  });

  const app = await prismock.app.create({
    data: {
      slug: "google-calendar",
      dirName: "google-calendar",
    },
  });

  const credential = {
    ...getSampleCredential(),
    ...(delegationCredentialId ? { delegationCredential: { connect: { id: delegationCredentialId } } } : {}),
    key: {
      ...googleTestCredentialKey,
      expiry_date: Date.now() - 1000,
    },
  };

  const credentialInDbOrInMemory = !delegatedTo
    ? await prismock.credential.create({
        data: {
          ...credential,
          user: {
            connect: {
              id: defaultUser.id,
            },
          },
          app: {
            connect: {
              slug: app.slug,
            },
          },
        },
        include: {
          user: true,
        },
      })
    : createInMemoryCredential({
        userId: defaultUser.id,
        delegationCredentialId: delegationCredentialId!,
        delegatedTo,
      });

  return {
    ...credentialInDbOrInMemory,
    delegationCredentialId: delegationCredentialId ?? null,
    user: user ? { email: user.email ?? "" } : null,
    delegatedTo,
  } as CredentialForCalendarServiceWithEmail;
}

export const defaultDelegatedCredential = {
  serviceAccountKey: {
    client_email: "service@example.com",
    client_id: "service-client-id",
    private_key: "service-private-key",
  },
} as const;

export async function createInMemoryDelegationCredentialForCalendarService({
  user,
  delegatedTo,
  delegationCredentialId,
}: {
  user?: { email: string | null } | null;
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

export const createMockJWTInstance = ({
  email = "user@example.com",
  authorizeError,
  tokenExpiryDate,
}: {
  email?: string;
  authorizeError?: { response?: { data?: { error?: string } } } | Error;
  tokenExpiryDate?: number;
}) => {
  console.log("createMockJWTInstance", { email, authorizeError });
  const mockJWTInstance = {
    type: "jwt" as const,
    config: {
      email: defaultDelegatedCredential.serviceAccountKey.client_email,
      key: defaultDelegatedCredential.serviceAccountKey.private_key,
      scopes: ["https://www.googleapis.com/auth/calendar"],
      subject: email,
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    authorize: authorizeError
      ? vi.fn().mockRejectedValue(authorizeError)
      : vi.fn().mockResolvedValue({
          ...MOCK_JWT_TOKEN,
          expiry_date: tokenExpiryDate ?? MOCK_JWT_TOKEN.expiry_date,
        }),
    createScoped: vi.fn(),
    getRequestMetadataAsync: vi.fn(),
    fetchIdToken: vi.fn(),
    hasUserScopes: vi.fn(),
    getAccessToken: vi.fn(),
    getRefreshToken: vi.fn(),
    getTokenInfo: vi.fn(),
    refreshAccessToken: vi.fn(),
    revokeCredentials: vi.fn(),
    revokeToken: vi.fn(),
    verifyIdToken: vi.fn(),
    on: vi.fn(),
    setCredentials: vi.fn(),
    getCredentials: vi.fn(),
    hasAnyScopes: vi.fn(),
    authorizeAsync: vi.fn(),
    refreshTokenNoCache: vi.fn(),
    createGToken: vi.fn(),
  };

  vi.mocked(JWT).mockImplementation(function () {
    setLastCreatedJWT(mockJWTInstance);
    return mockJWTInstance as unknown as JWT;
  });
  return mockJWTInstance;
};

const googleTestCredentialKey = {
  scope: "https://www.googleapis.com/auth/calendar.events",
  token_type: "Bearer",
  expiry_date: 1625097600000,
  access_token: "",
  refresh_token: "",
};

const getSampleCredential = () => {
  return {
    invalid: false,
    key: googleTestCredentialKey,
    type: "google_calendar",
  };
};
