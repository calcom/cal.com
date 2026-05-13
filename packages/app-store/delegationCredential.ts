import { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";
import { prisma } from "@calcom/prisma";
import type { SelectedCalendar } from "@calcom/prisma/client";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import type { CredentialForCalendarService, CredentialPayload } from "@calcom/types/Credential";

type Host<TUser extends { id: number; email: string; credentials: CredentialPayload[] }> = {
  user: TUser;
};

export async function getAllDelegationCredentialsForUserIncludeServiceAccountKey(_args: {
  user: { email: string; id: number };
}) {
  return [] as CredentialForCalendarService[];
}

export async function getAllDelegationCredentialsForUser(_args: { user: { email: string; id: number } }) {
  return [] as CredentialForCalendarService[];
}

export async function getAllDelegatedCalendarCredentialsForUser(_args: {
  user: { email: string; id: number };
}) {
  return [] as CredentialForCalendarService[];
}

export async function assertSuccessfullyConfiguredInWorkspace(_args: {
  delegationCredential: unknown;
  user: unknown;
}): Promise<void> {
  throw new Error("Delegation credentials are not available in the community edition");
}

export async function getAllDelegationCredentialsForUserByAppType(_args: {
  user: { email: string; id: number };
  appType: string;
}) {
  return [] as CredentialForCalendarService[];
}

export async function getAllDelegationCredentialsForUserByAppSlug(_args: {
  user: { email: string; id: number };
  appSlug: string;
}) {
  return [] as CredentialForCalendarService[];
}

export const buildAllCredentials = ({
  existingCredentials,
}: {
  delegationCredentials: CredentialForCalendarService[];
  existingCredentials: CredentialPayload[];
}) => {
  return existingCredentials as CredentialForCalendarService[];
};

export async function enrichUsersWithDelegationCredentials<
  TUser extends { id: number; email: string; credentials: CredentialPayload[] },
>({ users }: { orgId: number | null; users: TUser[] }) {
  return users;
}

export const enrichHostsWithDelegationCredentials = async <
  THost extends Host<TUser>,
  TUser extends { id: number; email: string; credentials: CredentialPayload[] },
>({
  hosts,
}: {
  orgId: number | null;
  hosts: THost[];
}) => {
  return hosts;
};

export const enrichUserWithDelegationCredentialsIncludeServiceAccountKey = async <
  TUser extends { id: number; email: string; credentials: CredentialPayload[] },
>({
  user,
}: {
  user: TUser;
}) => {
  return user;
};

export const enrichUserWithDelegationCredentials = async <
  TUser extends { id: number; email: string; credentials: CredentialPayload[] },
>({
  user,
}: {
  user: TUser;
}) => {
  return user;
};

export async function enrichUserWithDelegationConferencingCredentialsWithoutOrgId<
  TUser extends { id: number; email: string; credentials: CredentialPayload[] },
>({ user }: { user: TUser }) {
  return user;
}

export async function getDelegationCredentialOrFindRegularCredential<
  TDelegationCredential extends { delegatedToId?: string | null },
>({
  id,
}: {
  id: {
    credentialId: number | null | undefined;
    delegationCredentialId: string | null | undefined;
  };
  delegationCredentials: TDelegationCredential[];
}) {
  return id.credentialId
    ? await CredentialRepository.findCredentialForCalendarServiceById({
        id: id.credentialId,
      })
    : null;
}

export function getDelegationCredentialOrRegularCredential<
  TCredential extends { delegatedToId?: string | null; id: number },
>({
  credentials,
  id,
}: {
  credentials: TCredential[];
  id: { credentialId: number | null | undefined; delegationCredentialId: string | null | undefined };
}) {
  return (
    credentials.find((cred) => {
      if (id.credentialId) {
        return cred.id === id.credentialId;
      }
      return false;
    }) || null
  );
}

export function getFirstDelegationConferencingCredential(_args: {
  credentials: CredentialForCalendarService[];
}) {
  return undefined;
}

export function getFirstDelegationConferencingCredentialAppLocation(_args: {
  credentials: CredentialForCalendarService[];
}) {
  return null;
}

export async function findUniqueDelegationCalendarCredential(_args: {
  userId: number;
  delegationCredentialId: string;
}) {
  return null;
}

export async function getUsersCredentialsIncludeServiceAccountKey(user: { id: number; email: string }) {
  return prisma.credential.findMany({
    where: {
      userId: user.id,
    },
    select: credentialForCalendarServiceSelect,
    orderBy: {
      id: "asc",
    },
  });
}

export async function getUsersCredentials(user: { id: number; email: string }) {
  return getUsersCredentialsIncludeServiceAccountKey(user);
}

export async function getCredentialForSelectedCalendar({
  credentialId,
}: Partial<SelectedCalendar>) {
  if (credentialId) {
    const credentialRepository = new CredentialRepository(prisma);
    const credential = await credentialRepository.findByIdWithDelegationCredential(credentialId);
    return credential ?? undefined;
  }
  return undefined;
}
