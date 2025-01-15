import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { metadata as googleCalendarMetadata } from "@calcom/app-store/googlecalendar/_metadata";
import { metadata as googleMeetMetadata } from "@calcom/app-store/googlevideo/_metadata";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { CredentialRepository } from "@calcom/lib/server/repository/credential";
import type { ServiceAccountKey } from "@calcom/lib/server/repository/domainWideDelegation";
import { DomainWideDelegationRepository } from "@calcom/lib/server/repository/domainWideDelegation";
import type { CredentialForCalendarService, CredentialPayload } from "@calcom/types/Credential";

import { buildNonDwdCredentials, isDomainWideDelegationCredential } from "./clientAndServer";

export { buildNonDwdCredentials, buildNonDwdCredential } from "./clientAndServer";

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
const _isConferencingCredential = (credential: CredentialPayload) => {
  return (
    credential.type.endsWith("_video") ||
    credential.type.endsWith("_conferencing") ||
    credential.type.endsWith("_messaging")
  );
};

const _buildCommonUserCredential = ({ dwd, user }: { dwd: DomainWideDelegation; user: User }) => {
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

const _buildDwdCalendarCredential = ({ dwd, user }: { dwd: DomainWideDelegation; user: User }) => {
  log.debug("buildDomainWideDelegationCredential", safeStringify({ dwd, user }));
  // TODO: Build for other platforms as well
  if (dwd.workspacePlatform.slug !== "google") {
    log.warn(`Only Google Platform is supported here, skipping ${dwd.workspacePlatform.slug}`);
    return null;
  }
  return {
    type: googleCalendarMetadata.type,
    appId: googleCalendarMetadata.slug,
    ..._buildCommonUserCredential({ dwd, user }),
  };
};

const _buildDwdCalendarCredentialWithServiceAccountKey = ({
  dwd,
  user,
}: {
  dwd: DomainWideDelegationWithSensitiveServiceAccountKey;
  user: User;
}) => {
  const credential = _buildDwdCalendarCredential({ dwd, user });
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

const _buildDwdConferencingCredential = ({ dwd, user }: { dwd: DomainWideDelegation; user: User }) => {
  // TODO: Build for other platforms as well
  if (dwd.workspacePlatform.slug !== "google") {
    log.warn(`Only Google Platform is supported here, skipping ${dwd.workspacePlatform.slug}`);
    return null;
  }

  return {
    type: googleMeetMetadata.type,
    appId: googleMeetMetadata.slug,
    ..._buildCommonUserCredential({ dwd, user }),
  };
};

/**
 * Gets calendar as well as conferencing credentials(stored in-memory) for the user from the corresponding enabled DomainWideDelegation.
 */
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
    _buildDwdCalendarCredential({ dwd, user }),
    _buildDwdConferencingCredential({ dwd, user }),
  ].filter((credential): credential is NonNullable<typeof credential> => credential !== null);

  log.debug("Returned", safeStringify({ domainWideDelegationCredentials }));
  return domainWideDelegationCredentials;
}

export async function getAllDwdCalendarCredentialsForUser({ user }: { user: { email: string; id: number } }) {
  const dwdCredentials = await getAllDwdCredentialsForUser({ user });
  return dwdCredentials.filter((credential) => credential.type.endsWith("_calendar"));
}

async function _getDwdCredentialsMapPerUser({
  organizationId,
  users,
}: {
  organizationId: number | null;
  users: User[];
}) {
  const emptyMap = new Map<number, NonNullable<ReturnType<typeof _buildDwdCalendarCredential>>[]>();
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

  const credentialsByUserId = new Map<
    number,
    NonNullable<ReturnType<typeof _buildDwdCalendarCredential>>[]
  >();

  for (const user of users) {
    const domainWideDelegationCredentials = [
      _buildDwdCalendarCredential({ dwd, user }),
      _buildDwdConferencingCredential({ dwd, user }),
    ].filter((credential): credential is NonNullable<typeof credential> => credential !== null);

    log.debug("Returned for user", safeStringify({ user, domainWideDelegationCredentials }));
    credentialsByUserId.set(user.id, domainWideDelegationCredentials);
  }

  return credentialsByUserId;
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

  const credential = _buildDwdCalendarCredentialWithServiceAccountKey({
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

type Host<TUser extends { id: number; email: string; credentials: CredentialPayload[] }> = {
  user: TUser;
};

/**
 * Prepares credentials for use by CalendarService and EventManager
 * - Ensures no duplicate dwd credentials caused by enrichment at possibly multiple places
 */
export const buildAllCredentials = ({
  dwdCredentials,
  existingCredentials,
}: {
  dwdCredentials: CredentialForCalendarService[] | null;
  existingCredentials: CredentialPayload[];
}) => {
  const nonDwdCredentials = existingCredentials.filter(
    (cred) => !isDomainWideDelegationCredential({ credentialId: cred.id })
  );
  const allCredentials: CredentialForCalendarService[] = [
    ...(dwdCredentials ?? []),
    ...buildNonDwdCredentials(nonDwdCredentials),
  ];

  const uniqueAllCredentials = allCredentials.reduce((acc, credential) => {
    if (!credential.delegatedToId) {
      // Regular credential go as is
      acc.push(credential);
      return acc;
    }
    const existingDwdCredential = acc.find(
      (c) => c.delegatedToId === credential.delegatedToId && c.appId === credential.appId
    );
    if (!existingDwdCredential) {
      acc.push(credential);
    }
    return acc;
  }, [] as typeof allCredentials);

  return uniqueAllCredentials;
};

export async function enrichUsersWithDwdCredentials<
  TUser extends { id: number; email: string; credentials: CredentialPayload[] }
>({ orgId, users }: { orgId: number | null; users: TUser[] }) {
  const dwdCredentialsMap = await _getDwdCredentialsMapPerUser({
    organizationId: orgId,
    users,
  });

  return users.map((user) => {
    const { credentials, ...rest } = user;

    return {
      ...rest,
      credentials: buildAllCredentials({
        dwdCredentials: dwdCredentialsMap.get(user.id) ?? [],
        existingCredentials: credentials,
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
  const dwdCredentialsMap = await _getDwdCredentialsMapPerUser({
    organizationId: orgId,
    users: hosts.map((host) => host.user),
  });

  return hosts.map((host) => {
    const { credentials, ...restUser } = host.user;
    return {
      ...host,
      user: {
        ...restUser,
        credentials: buildAllCredentials({
          dwdCredentials: dwdCredentialsMap.get(restUser.id) ?? [],
          existingCredentials: credentials,
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
    credentials: buildAllCredentials({
      dwdCredentials: dwdCredentials,
      existingCredentials: credentials,
    }),
  };
};

export async function enrichUserWithDwdConferencingCredentialsWithoutOrgId<
  TUser extends { id: number; email: string; credentials: CredentialPayload[] }
>({ user }: { user: TUser }) {
  const { credentials, ...restUser } = await enrichUserWithDwdCredentialsWithoutOrgId({ user });
  return {
    ...restUser,
    credentials: credentials.filter(_isConferencingCredential),
  };
}

export async function findDwdOrRegularCredential({
  id,
  dwdCredentials,
}: {
  id: {
    credentialId: number | null | undefined;
    domainWideDelegationCredentialId: string | null | undefined;
  };
  dwdCredentials: CredentialForCalendarService[];
}) {
  return id.domainWideDelegationCredentialId
    ? dwdCredentials.find((cred) => cred.delegatedToId === id.domainWideDelegationCredentialId)
    : id.credentialId
    ? await CredentialRepository.findCredentialForCalendarServiceById({
        id: id.credentialId,
      })
    : null;
}

/**
 * Utility function to find a credential from a list of credentials, supporting both regular and DWD credentials
 */
export function getDwdOrRegularCredential<TCredential extends { delegatedToId?: string | null; id: number }>({
  credentials,
  id,
}: {
  credentials: TCredential[];
  id: { credentialId: number | null | undefined; dwdId: string | null | undefined };
}) {
  return (
    credentials.find((cred) => {
      // Ensure that we don't match null to null
      if (cred.delegatedToId) {
        return cred.delegatedToId === id.dwdId;
      }
      return cred.id === id.credentialId;
    }) || null
  );
}
