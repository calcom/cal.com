import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { metadata as googleCalendarMetadata } from "@calcom/app-store/googlecalendar/_metadata";
import { metadata as googleMeetMetadata } from "@calcom/app-store/googlevideo/_metadata";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { ServiceAccountKey } from "@calcom/lib/server/repository/domainWideDelegation";
import { DomainWideDelegationRepository } from "@calcom/lib/server/repository/domainWideDelegation";
import { UserRepository } from "@calcom/lib/server/repository/user";
import type { CredentialForCalendarService, CredentialPayload } from "@calcom/types/Credential";

import { withDelegatedToIdNullArray } from "../server/repository/credential";

const log = logger.getSubLogger({ prefix: ["lib/domainWideDelegation/server"] });
interface DomainWideDelegation {
  id: string;
  workspacePlatform: {
    slug: string;
  };
  serviceAccountKey: ServiceAccountKey | null;
}

interface DomainWideDelegationWithSensitiveServiceAccountKey extends DomainWideDelegation {
  serviceAccountKey: ServiceAccountKey;
}

interface User {
  email: string;
  id: number;
}

const buildCommonUserCredential = ({ dwd, user }: { dwd: DomainWideDelegation; user: User }) => {
  return {
    id: -1,
    delegatedToId: dwd.id,
    userId: user.id,
    user: {
      email: user.email,
    },
    key: {
      access_token: "NOOP_UNUSED_DELEGATION_TOKEN",
    },
    invalid: false,
    teamId: null,
    team: null,
    delegatedTo: dwd.serviceAccountKey
      ? {
          serviceAccountKey: dwd.serviceAccountKey,
        }
      : null,
  };
};

const buildDwdCalendarCredential = ({ dwd, user }: { dwd: DomainWideDelegation; user: User }) => {
  log.debug("buildDomainWideDelegationCredential", safeStringify({ dwd, user }));
  // TODO: Build for other platforms as well
  if (dwd.workspacePlatform.slug !== "google") {
    log.warn(`Only Google Platform is supported here, skipping ${dwd.workspacePlatform.slug}`);
    return null;
  }
  return {
    type: googleCalendarMetadata.type,
    appId: googleCalendarMetadata.slug,
    ...buildCommonUserCredential({ dwd, user }),
  };
};

const buildDwdCalendarCredentialWithServiceAccountKey = ({
  dwd,
  user,
}: {
  dwd: DomainWideDelegationWithSensitiveServiceAccountKey;
  user: User;
}) => {
  const credential = buildDwdCalendarCredential({ dwd, user });
  if (!credential) {
    return null;
  }
  return {
    ...credential,
    delegatedTo: {
      serviceAccountKey: dwd.serviceAccountKey,
    },
  };
};

const buildDwdConferencingCredential = ({ dwd, user }: { dwd: DomainWideDelegation; user: User }) => {
  // TODO: Build for other platforms as well
  if (dwd.workspacePlatform.slug !== "google") {
    log.warn(`Only Google Platform is supported here, skipping ${dwd.workspacePlatform.slug}`);
    return null;
  }
  return {
    type: googleMeetMetadata.type,
    appId: googleMeetMetadata.slug,
    ...buildCommonUserCredential({ dwd, user }),
  };
};

/**
 * Gets calendar as well as conferencing credentials(stored in-memory) for the user from the corresponding enabled DomainWideDelegation.
 */
// TODO: Consider using getAllDwdCredentialsForUsers in it which requires organizationId to be present on user.
export async function getAllDwdCredentialsForUser({ user }: { user: { email: string; id: number } }) {
  log.debug("called with", safeStringify({ user }));
  // We access the repository without checking for feature flag here.
  // In case we need to disable the effects of DWD on credential we need to toggle DWD off from organization settings.
  // We could think of the teamFeatures flag to just disable the UI. The actual effect of DWD on credentials is disabled by toggling DWD off from UI
  const dwd = await DomainWideDelegationRepository.findByUserIncludeSensitiveServiceAccountKey({
    user: {
      email: user.email,
    },
  });

  if (!dwd || !dwd.enabled) {
    return [];
  }

  const domainWideDelegationCredentials = [
    buildDwdCalendarCredential({ dwd, user }),
    buildDwdConferencingCredential({ dwd, user }),
  ].filter((credential): credential is NonNullable<typeof credential> => credential !== null);

  log.debug("Returned", safeStringify({ domainWideDelegationCredentials }));
  return domainWideDelegationCredentials;
}

export async function getAllDwdCalendarCredentialsForUser({ user }: { user: { email: string; id: number } }) {
  const dwdCredentials = await getAllDwdCredentialsForUser({ user });
  return dwdCredentials.filter((credential) => credential.type.endsWith("_calendar"));
}

export async function getAllDwdCredentialsForUsers({
  organizationId,
  users,
}: {
  organizationId: number | null;
  users: User[];
}) {
  const emptyMap = new Map<number, NonNullable<ReturnType<typeof buildDwdCalendarCredential>>[]>();
  if (!organizationId) {
    return emptyMap;
  }
  const domain = users[0].email.split("@")[1];
  log.debug("called with", safeStringify({ users }));
  const dwd =
    await DomainWideDelegationRepository.findUniqueByOrganizationIdAndDomainIncludeSensitiveServiceAccountKey(
      {
        organizationId,
        domain,
      }
    );
  if (!dwd || !dwd.enabled) {
    return emptyMap;
  }

  const credentialsByUserId = new Map<number, NonNullable<ReturnType<typeof buildDwdCalendarCredential>>[]>();

  for (const user of users) {
    const domainWideDelegationCredentials = [
      buildDwdCalendarCredential({ dwd, user }),
      buildDwdConferencingCredential({ dwd, user }),
    ].filter((credential): credential is NonNullable<typeof credential> => credential !== null);

    log.debug("Returned for user", safeStringify({ user, domainWideDelegationCredentials }));
    credentialsByUserId.set(user.id, domainWideDelegationCredentials);
  }

  return credentialsByUserId;
}

export async function getAllDwdCalendarCredentialsForUsers({
  organizationId,
  users,
}: {
  organizationId: number | null;
  users: User[];
}) {
  const emptyMap = new Map<number, NonNullable<ReturnType<typeof buildDwdCalendarCredential>>[]>();
  if (!organizationId) {
    return emptyMap;
  }
  const dwdCredentialsMap = await getAllDwdCredentialsForUsers({ organizationId, users });
  const calendarCredentialsMap = new Map(
    Array.from(dwdCredentialsMap.entries()).map(([userId, credentials]) => [
      userId,
      credentials.filter((credential) => credential.type.endsWith("_calendar")),
    ])
  );
  return calendarCredentialsMap;
}

export async function getAllDwdConferencingCredentialsForUser({
  user,
}: {
  user: { email: string; id: number };
}) {
  const dwdCredentials = await getAllDwdCredentialsForUser({ user });
  return dwdCredentials.filter(
    (credential) =>
      credential.type.endsWith("_video") ||
      credential.type.endsWith("_conferencing") ||
      credential.type.endsWith("_messaging")
  );
}

export async function checkIfSuccessfullyConfiguredInWorkspace({
  dwd,
  user,
}: {
  dwd: DomainWideDelegationWithSensitiveServiceAccountKey;
  user: User;
}) {
  if (dwd.workspacePlatform.slug !== "google") {
    log.warn(`Only Google Platform is supported here, skipping ${dwd.workspacePlatform.slug}`);
    return false;
  }

  const credential = buildDwdCalendarCredentialWithServiceAccountKey({
    dwd,
    user,
  });

  const googleCalendar = await getCalendar(credential);

  if (!googleCalendar) {
    throw new Error("Google Calendar App not found");
  }
  return await googleCalendar?.testDomainWideDelegationSetup?.();
}

export async function getAllDwdCredentialsForUserByAppType({
  user,
  appType,
}: {
  user: User;
  appType: string;
}) {
  const dwdCredentials = await getAllDwdCredentialsForUser({
    user,
  });
  return dwdCredentials.filter((credential) => credential.type === appType);
}

export async function getAllDwdCredentialsForUserByAppSlug({
  user,
  appSlug,
}: {
  user: User;
  appSlug: string;
}) {
  const dwdCredentials = await getAllDwdCredentialsForUser({ user });
  return dwdCredentials.filter((credential) => credential.appId === appSlug);
}

export async function getDwdCalendarCredentialById({ id, userId }: { id: string; userId: number }) {
  const [dwd, user] = await Promise.all([
    DomainWideDelegationRepository.findByIdIncludeSensitiveServiceAccountKey({ id }),
    UserRepository.findById({ id: userId }),
  ]);

  if (!dwd) {
    throw new Error("Domain Wide Delegation not found");
  }
  if (!user) {
    throw new Error("User not found");
  }

  const dwdCredential = buildDwdCalendarCredential({
    dwd,
    user,
  });
  return dwdCredential;
}

type Host<TUser extends { id: number; email: string; credentials: CredentialPayload[] }> = {
  user: TUser;
};

const _buildAllCredentials = ({
  dwdCredentials,
  nonDwdCredentials,
}: {
  dwdCredentials: CredentialForCalendarService[] | null;
  nonDwdCredentials: CredentialPayload[];
}) => {
  const allCredentials: CredentialForCalendarService[] = [
    ...withDelegatedToIdNullArray(nonDwdCredentials),
    ...(dwdCredentials ?? []),
  ];
  return allCredentials;
};

export async function enrichUsersWithDwdCredentials<
  TUser extends { id: number; email: string; credentials: CredentialPayload[] }
>({ orgId, users }: { orgId: number | null; users: TUser[] }) {
  const dwdCredentialsMap = await getAllDwdCredentialsForUsers({
    organizationId: orgId,
    users,
  });

  return users.map((user) => {
    const { credentials, ...rest } = user;

    return {
      ...rest,
      credentials: _buildAllCredentials({
        dwdCredentials: dwdCredentialsMap.get(user.id) ?? [],
        nonDwdCredentials: credentials,
      }),
    };
  });
}

export const enrichHostsWithDwdCredentials = async <
  THost extends Host<TUser>,
  TUser extends { id: number; email: string; credentials: CredentialPayload[] }
>({
  orgId,
  hosts,
}: {
  orgId: number | null;
  hosts: THost[];
}) => {
  const dwdCredentialsMap = await getAllDwdCredentialsForUsers({
    organizationId: orgId,
    users: hosts.map((host) => host.user),
  });

  return hosts.map((host) => {
    const { credentials, ...restUser } = host.user;
    return {
      ...host,
      user: {
        ...restUser,
        credentials: _buildAllCredentials({
          dwdCredentials: dwdCredentialsMap.get(restUser.id) ?? [],
          nonDwdCredentials: credentials,
        }),
      },
    };
  });
};

export const enrichUserWithDwdCredentialsWithoutOrgId = async <
  TUser extends { id: number; email: string; credentials: CredentialPayload[] }
>({
  user,
}: {
  user: TUser;
}) => {
  const dwdCredentials = await getAllDwdCredentialsForUser({ user });
  const { credentials, ...restUser } = user;
  return {
    ...restUser,
    credentials: _buildAllCredentials({
      dwdCredentials: dwdCredentials,
      nonDwdCredentials: credentials,
    }),
  };
};
