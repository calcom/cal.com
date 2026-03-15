import type { Prisma } from "@calcom/prisma/client";

/*
 * The logic on this it's just using Credential Type doesn't reflect that some fields can be
 * null sometimes, so with this we should get correct type.
 * Also there may be a better place to save this.
 */
export type CredentialPayload = Prisma.CredentialGetPayload<{
  select: typeof import("@calcom/prisma/selects/credential").credentialForCalendarServiceSelect;
}> & {
  delegatedToId?: string | null;
  appName?: string;
};

export type CredentialForCalendarService = CredentialPayload & {
  delegatedTo: {
    serviceAccountKey: {
      client_email?: string;
      tenant_id?: string;
      client_id: string;
      private_key: string;
    };
  } | null;
};

export type CredentialForCalendarServiceWithEmail = CredentialPayload & {
  delegatedTo: {
    serviceAccountKey: {
      client_email: string;
      tenant_id?: undefined;
      client_id: string;
      private_key: string;
    };
  } | null;
};

export type CredentialForCalendarServiceWithTenantId = CredentialPayload & {
  delegatedTo: {
    serviceAccountKey: {
      client_email?: undefined;
      tenant_id: string;
      client_id: string;
      private_key: string;
    };
  } | null;
};

export type Office365CredentialPayload = CredentialPayload & {
  delegatedTo: {
    serviceAccountKey: {
      tenant_id: string;
      client_id: string;
      private_key: string;
    };
  } | null;
};

export type CredentialFrontendPayload = Omit<CredentialPayload, "key" | "encryptedKey"> & {
  /** We should type error if keys are leaked to the frontend */
  key?: never;
  encryptedKey?: never;
};
