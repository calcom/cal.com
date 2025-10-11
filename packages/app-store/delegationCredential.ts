import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { metadata as googleCalendarMetadata } from "@calcom/app-store/googlecalendar/_metadata";
import { metadata as googleMeetMetadata } from "@calcom/app-store/googlevideo/_metadata";
import { metadata as office365CalendarMetaData } from "@calcom/app-store/office365calendar/_metadata";
import { metadata as office365VideoMetaData } from "@calcom/app-store/office365video/_metadata";
import {
  buildNonDelegationCredential,
  buildNonDelegationCredentials,
  isDelegationCredential,
} from "@calcom/lib/delegationCredential";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { CredentialRepository } from "@calcom/lib/server/repository/credential";
import type { ServiceAccountKey } from "@calcom/lib/server/repository/delegationCredential";
import { DelegationCredentialRepository } from "@calcom/lib/server/repository/delegationCredential";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { prisma } from "@calcom/prisma";
import type { SelectedCalendar } from "@calcom/prisma/client";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import type { CredentialForCalendarService, CredentialPayload } from "@calcom/types/Credential";

const GOOGLE_WORKSPACE_SLUG = "google";
const OFFICE365_WORKSPACE_SLUG = "office365";
const WORKSPACE_PLATFORM_SLUGS = [GOOGLE_WORKSPACE_SLUG, OFFICE365_WORKSPACE_SLUG] as const;
type WORKSPACE_PLATFORM_SLUGS_TYPE = (typeof WORKSPACE_PLATFORM_SLUGS)[number];

const log = logger.getSubLogger({ prefix: ["app-store/delegationCredential"] });
interface DelegationCredential {
  id: string;
  workspacePlatform: {
    slug: string;
  };
  serviceAccountKey: ServiceAccountKey | null;
}

interface DelegationCredentialWithSensitiveServiceAccountKey extends DelegationCredential {
  serviceAccountKey: ServiceAccountKey;
}

interface User {
  email: string;
  id: number;
}

const isValidWorkspaceSlug = (slug: string) => {
  return WORKSPACE_PLATFORM_SLUGS.includes(slug as unknown as WORKSPACE_PLATFORM_SLUGS_TYPE);
};

const getDelegationCredentialAppMetadata = (
  slug: WORKSPACE_PLATFORM_SLUGS_TYPE,
  isConferencing?: boolean
) => {
  switch (slug) {
    case GOOGLE_WORKSPACE_SLUG:
      return isConferencing
        ? { type: googleMeetMetadata.type, appId: googleMeetMetadata.slug }
        : { type: googleCalendarMetadata.type, appId: googleCalendarMetadata.slug };

    case OFFICE365_WORKSPACE_SLUG:
      return isConferencing
        ? { type: office365VideoMetaData.type, appId: office365VideoMetaData.slug }
        : { type: office365CalendarMetaData.type, appId: office365CalendarMetaData.slug };

    default:
      throw new Error("App metadata does not exist");
  }
};

const _isConferencingCredential = (credential: CredentialPayload) => {
  return (
    credential.type.endsWith("_video") ||
    credential.type.endsWith("_conferencing") ||
    credential.type.endsWith("_messaging")
  );
};

const _buildCommonUserCredential = ({
  delegationCredential,
  user,
}: {
  delegationCredential: DelegationCredential;
  user: User;
}) => {
  return {
    id: -1,
    delegatedToId: delegationCredential.id,
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
    delegationCredentialId: delegationCredential.id,
    delegatedTo: delegationCredential.serviceAccountKey
      ? {
          serviceAccountKey: delegationCredential.serviceAccountKey,
        }
      : null,
  };
};

const _buildDelegatedCalendarCredential = ({
  delegationCredential,
  user,
}: {
  delegationCredential: DelegationCredential;
  user: User;
}) => {
  log.debug(
    "buildDelegationCredential",
    safeStringify({
      delegationCredential: {
        id: delegationCredential.id,
      },
      user: {
        id: user.id,
        email: user.email,
      },
    })
  );
  // TODO: Build for other platforms as well
  if (!isValidWorkspaceSlug(delegationCredential.workspacePlatform.slug)) {
    log.warn(
      `Only ${WORKSPACE_PLATFORM_SLUGS.toString()} Platforms are supported here, skipping ${
        delegationCredential.workspacePlatform.slug
      }`
    );
    return null;
  }
  return {
    ...getDelegationCredentialAppMetadata(
      delegationCredential.workspacePlatform.slug as unknown as WORKSPACE_PLATFORM_SLUGS_TYPE,
      false
    ),
    ..._buildCommonUserCredential({ delegationCredential, user }),
  };
};

const _buildDelegatedCalendarCredentialWithServiceAccountKey = ({
  delegationCredential,
  user,
}: {
  delegationCredential: DelegationCredentialWithSensitiveServiceAccountKey;
  user: User;
}) => {
  const credential = _buildDelegatedCalendarCredential({ delegationCredential, user });
  if (!credential) {
    return null;
  }
  return {
    ...credential,
    delegatedTo: {
      serviceAccountKey: delegationCredential.serviceAccountKey,
    },
  };
};

const _buildDelegatedConferencingCredential = ({
  delegationCredential,
  user,
}: {
  delegationCredential: DelegationCredential;
  user: User;
}) => {
  // TODO: Build for other platforms as well
  if (!isValidWorkspaceSlug(delegationCredential.workspacePlatform.slug)) {
    log.warn(
      `Only ${WORKSPACE_PLATFORM_SLUGS.toString()} Platforms are supported here, skipping ${
        delegationCredential.workspacePlatform.slug
      }`
    );
    return null;
  }

  return {
    ...getDelegationCredentialAppMetadata(
      delegationCredential.workspacePlatform.slug as unknown as WORKSPACE_PLATFORM_SLUGS_TYPE,
      true
    ),
    ..._buildCommonUserCredential({ delegationCredential, user }),
  };
};

/**
 * Gets calendar as well as conferencing credentials(stored in-memory) for the user from the corresponding enabled DelegationCredential.
 */
export async function getAllDelegationCredentialsForUserIncludeServiceAccountKey({
  user,
}: {
  user: { email: string; id: number };
}) {
  log.debug("called with", safeStringify({ user }));
  // We access the repository without checking for feature flag here.
  // In case we need to disable the effects of DelegationCredential on credential we need to toggle DelegationCredential off from organization settings.
  // We could think of the teamFeatures flag to just disable the UI. The actual effect of DelegationCredential on credentials is disabled by toggling DelegationCredential off from UI
  const delegationCredential =
    await DelegationCredentialRepository.findUniqueByOrgMemberEmailIncludeSensitiveServiceAccountKey({
      email: user.email,
    });

  if (!delegationCredential || !delegationCredential.enabled) {
    return [];
  }

  const delegationCredentials = [
    _buildDelegatedCalendarCredential({ delegationCredential, user }),
    _buildDelegatedConferencingCredential({ delegationCredential, user }),
  ].filter((credential): credential is NonNullable<typeof credential> => credential !== null);

  log.debug("Returned", safeStringify({ delegationCredentials }));
  return delegationCredentials;
}

export async function getAllDelegationCredentialsForUser({ user }: { user: { email: string; id: number } }) {
  const delegationCredentials = await getAllDelegationCredentialsForUserIncludeServiceAccountKey({
    user,
  });
  return delegationCredentials.map(({ delegatedTo: _1, ...rest }) => {
    return {
      ...rest,
    };
  });
}

export async function getAllDelegatedCalendarCredentialsForUser({
  user,
}: {
  user: { email: string; id: number };
}) {
  const delegationCredentials = await getAllDelegationCredentialsForUserIncludeServiceAccountKey({
    user,
  });
  const delegationCalendarCredentials = delegationCredentials.filter((credential) =>
    credential.type.endsWith("_calendar")
  );
  return buildAllCredentials({
    delegationCredentials: delegationCalendarCredentials,
    existingCredentials: [],
  });
}

async function _getDelegationCredentialsMapPerUser({
  organizationId,
  users,
}: {
  organizationId: number | null;
  users: User[];
}) {
  const emptyMap = new Map<number, NonNullable<ReturnType<typeof _buildDelegatedCalendarCredential>>[]>();
  if (!organizationId) {
    return emptyMap;
  }
  // We assume that all users in an organization are from the same domain, so first one should be fine.
  // TODO: There could be multiple domains in an organization(if an organization is migrating maybe from one to another or for some other reason) and we should actually consider all of them, maybe group by domain.
  const userThatDeterminesDomain = users[0];
  if (!userThatDeterminesDomain) {
    return emptyMap;
  }
  const domain = userThatDeterminesDomain.email.split("@")[1];
  log.debug("called with", safeStringify({ users }));
  const delegationCredential =
    await DelegationCredentialRepository.findUniqueByOrganizationIdAndDomainIncludeSensitiveServiceAccountKey(
      {
        organizationId,
        domain,
      }
    );

  if (!delegationCredential || !delegationCredential.enabled) {
    return emptyMap;
  }

  const credentialsByUserId = new Map<
    number,
    NonNullable<ReturnType<typeof _buildDelegatedCalendarCredential>>[]
  >();

  for (const user of users) {
    const delegationCredentials = [
      _buildDelegatedCalendarCredential({ delegationCredential, user }),
      _buildDelegatedConferencingCredential({ delegationCredential, user }),
    ].filter((credential): credential is NonNullable<typeof credential> => credential !== null);

    log.debug(
      "Returned for user",
      safeStringify({
        user,
        delegationCredentialIds:
          delegationCredentials?.map?.((delegationCredential) => delegationCredential?.delegatedToId) ?? [],
      })
    );
    credentialsByUserId.set(user.id, delegationCredentials);
  }

  return credentialsByUserId;
}

export async function checkIfSuccessfullyConfiguredInWorkspace({
  delegationCredential,
  user,
}: {
  delegationCredential: DelegationCredentialWithSensitiveServiceAccountKey;
  user: User;
}) {
  if (!isValidWorkspaceSlug(delegationCredential.workspacePlatform.slug)) {
    log.warn(
      `Only ${WORKSPACE_PLATFORM_SLUGS.toString()} Platforms are supported here, skipping ${
        delegationCredential.workspacePlatform.slug
      }`
    );
    return false;
  }

  const credential = _buildDelegatedCalendarCredentialWithServiceAccountKey({
    delegationCredential,
    user,
  });

  const calendar = await getCalendar(credential);

  if (!calendar) {
    throw new Error("Google Calendar App not found");
  }
  return await calendar?.testDelegationCredentialSetup?.();
}

export async function getAllDelegationCredentialsForUserByAppType({
  user,
  appType,
}: {
  user: User;
  appType: string;
}) {
  const delegationCredentials = await getAllDelegationCredentialsForUser({
    user,
  });
  return delegationCredentials.filter((credential) => credential.type === appType);
}

export async function getAllDelegationCredentialsForUserByAppSlug({
  user,
  appSlug,
}: {
  user: User;
  appSlug: string;
}) {
  const delegationCredentials = await getAllDelegationCredentialsForUserIncludeServiceAccountKey({
    user,
  });
  const appDelegationCredentials = delegationCredentials.filter((credential) => credential.appId === appSlug);
  return buildAllCredentials({
    delegationCredentials: appDelegationCredentials,
    existingCredentials: [],
  });
}

type Host<TUser extends { id: number; email: string; credentials: CredentialPayload[] }> = {
  user: TUser;
};

/**
 * Prepares credentials for use by CalendarService and EventManager
 * - Ensures no duplicate delegationCredentials caused by enrichment at possibly multiple places
 */
export const buildAllCredentials = ({
  delegationCredentials,
  existingCredentials,
}: {
  delegationCredentials: CredentialForCalendarService[];
  existingCredentials: CredentialPayload[];
}) => {
  const nonDelegationCredentials = existingCredentials.filter(
    (cred) => !isDelegationCredential({ credentialId: cred.id })
  );
  const allCredentials: CredentialForCalendarService[] = [
    ...delegationCredentials,
    ...buildNonDelegationCredentials(nonDelegationCredentials),
  ];

  const uniqueAllCredentials = allCredentials.reduce((acc, credential) => {
    if (!credential.delegatedToId) {
      // Regular credential go as is
      acc.push(credential);
      return acc;
    }
    const existingDelegationCredential = acc.find(
      (c) => c.delegatedToId === credential.delegatedToId && c.appId === credential.appId
    );
    if (!existingDelegationCredential) {
      acc.push(credential);
    }
    return acc;
  }, [] as typeof allCredentials);

  return uniqueAllCredentials;
};

export async function enrichUsersWithDelegationCredentials<
  TUser extends { id: number; email: string; credentials: CredentialPayload[] }
>({ orgId, users }: { orgId: number | null; users: TUser[] }) {
  const delegationCredentialsMap = await _getDelegationCredentialsMapPerUser({
    organizationId: orgId,
    users,
  });

  const enrichedUsers = users.map((user) => {
    const { credentials, ...rest } = user;
    const enrichedCredentials = buildAllCredentials({
      delegationCredentials: delegationCredentialsMap.get(user.id) ?? [],
      existingCredentials: credentials,
    });
    return {
      ...rest,
      credentials: enrichedCredentials,
    };
  });
  log.debug("enrichUsersWithDelegationCredentials", safeStringify({ enrichedUsers, orgId }));
  return enrichedUsers;
}

export const enrichHostsWithDelegationCredentials = async <
  THost extends Host<TUser>,
  TUser extends { id: number; email: string; credentials: CredentialPayload[] }
>({
  orgId,
  hosts,
}: {
  orgId: number | null;
  hosts: THost[];
}) => {
  const delegationCredentialsMap = await _getDelegationCredentialsMapPerUser({
    organizationId: orgId,
    users: hosts.map((host) => host.user),
  });

  const enrichedHosts = hosts.map((host) => {
    const { credentials, ...restUser } = host.user;
    return {
      ...host,
      user: {
        ...restUser,
        credentials: buildAllCredentials({
          delegationCredentials: delegationCredentialsMap.get(restUser.id) ?? [],
          existingCredentials: credentials,
        }),
      },
    };
  });
  log.debug(
    "enrichHostsWithDelegationCredentials",
    safeStringify({
      enrichedHosts: enrichedHosts.map((host) => {
        return {
          userId: host.user.id,
        };
      }),
      orgId,
    })
  );
  return enrichedHosts;
};

export const enrichUserWithDelegationCredentialsIncludeServiceAccountKey = async <
  TUser extends { id: number; email: string; credentials: CredentialPayload[] }
>({
  user,
}: {
  user: TUser;
}) => {
  const delegationCredentials = await getAllDelegationCredentialsForUserIncludeServiceAccountKey({
    user,
  });
  const { credentials, ...restUser } = user;
  return {
    ...restUser,
    credentials: buildAllCredentials({
      delegationCredentials: delegationCredentials,
      existingCredentials: credentials,
    }),
  };
};

export const enrichUserWithDelegationCredentials = async <
  TUser extends { id: number; email: string; credentials: CredentialPayload[] }
>({
  user,
}: {
  user: TUser;
}) => {
  const { credentials, ...restUser } = await enrichUserWithDelegationCredentialsIncludeServiceAccountKey({
    user,
  });
  return {
    ...restUser,
    credentials: credentials.filter(_isConferencingCredential).map(({ delegatedTo: _1, ...rest }) => rest),
  };
};

export async function enrichUserWithDelegationConferencingCredentialsWithoutOrgId<
  TUser extends { id: number; email: string; credentials: CredentialPayload[] }
>({ user }: { user: TUser }) {
  const { credentials, ...restUser } = await enrichUserWithDelegationCredentialsIncludeServiceAccountKey({
    user,
  });
  return {
    ...restUser,
    credentials: credentials.filter(_isConferencingCredential),
  };
}

/**
 * Either get Delegation credential from delegationCredentials or find regular credential from Credential table
 */
export async function getDelegationCredentialOrFindRegularCredential<
  TDelegationCredential extends { delegatedToId?: string | null }
>({
  id,
  delegationCredentials,
}: {
  id: {
    credentialId: number | null | undefined;
    delegationCredentialId: string | null | undefined;
  };
  delegationCredentials: TDelegationCredential[];
}) {
  return id.delegationCredentialId
    ? delegationCredentials.find((cred) => cred.delegatedToId === id.delegationCredentialId)
    : id.credentialId
    ? await CredentialRepository.findCredentialForCalendarServiceById({
        id: id.credentialId,
      })
    : null;
}

/**
 * Utility function to find a credential from a list of credentials, supporting both regular and DelegationCredential credentials
 */
export function getDelegationCredentialOrRegularCredential<
  TCredential extends { delegatedToId?: string | null; id: number }
>({
  credentials,
  id,
}: {
  credentials: TCredential[];
  id: { credentialId: number | null | undefined; delegationCredentialId: string | null | undefined };
}) {
  return (
    credentials.find((cred) => {
      // Ensure that we don't match null to null
      if (cred.delegatedToId) {
        return cred.delegatedToId === id.delegationCredentialId;
      } else if (id.credentialId) {
        return cred.id === id.credentialId;
      }
      return false;
    }) || null
  );
}

export function getFirstDelegationConferencingCredential({
  credentials,
}: {
  credentials: CredentialForCalendarService[];
}) {
  return credentials.find((credential) => _isConferencingCredential(credential));
}

export function getFirstDelegationConferencingCredentialAppLocation({
  credentials,
}: {
  credentials: CredentialForCalendarService[];
}) {
  const delegatedConferencingCredential = getFirstDelegationConferencingCredential({ credentials });
  if (delegatedConferencingCredential?.appId === googleMeetMetadata.slug) {
    return googleMeetMetadata.appData?.location?.type ?? null;
  }
  if (delegatedConferencingCredential?.appId === office365VideoMetaData.slug) {
    return office365VideoMetaData.appData?.location?.type ?? null;
  }
  return null;
}

export async function findUniqueDelegationCalendarCredential({
  userId,
  delegationCredentialId,
}: {
  userId: number;
  delegationCredentialId: string;
}) {
  const [delegationCredential, user] = await Promise.all([
    DelegationCredentialRepository.findByIdIncludeSensitiveServiceAccountKey({ id: delegationCredentialId }),
    new UserRepository(prisma).findById({ id: userId }),
  ]);

  if (!delegationCredential) {
    throw new Error("Delegation Credential not found");
  }

  if (!delegationCredential.enabled) {
    return null;
  }

  if (!user) {
    throw new Error("User not found");
  }

  const dwdCredential = _buildDelegatedCalendarCredential({
    delegationCredential,
    user,
  });
  return dwdCredential;
}

/**
 * CredentialForCalendarCache is different from CredentialForCalendarService in the sense that CredentialForCalendarCache.id is greater than 0 and CredentialForCalendarService.id is -1
 * Thus it is a Credential from DB and and also a Delegation User Credential(when CredentialForCalendarCache.delegatedTo is not null)
 */
export async function getCredentialForCalendarCache({ credentialId }: { credentialId: number }) {
  const credential = await CredentialRepository.findByIdIncludeDelegationCredential({
    id: credentialId,
  });

  let credentialForCalendarService;

  if (credential?.delegationCredential) {
    if (!credential.userId) {
      throw new Error(`Credential ${credentialId} doesn't have a user`);
    }
    const delegationCredential = await findUniqueDelegationCalendarCredential({
      userId: credential.userId,
      delegationCredentialId: credential.delegationCredential.id,
    });

    if (!delegationCredential) {
      credentialForCalendarService = null;
    } else {
      // We prepare a credential that is in-db(in contrast with an in-memory credential used elsewhere where we generate CredentialForCalendarService)
      credentialForCalendarService = {
        ...delegationCredential,
        id: credential.id,
      };
    }
  } else {
    credentialForCalendarService = buildNonDelegationCredential(credential);
  }
  return credentialForCalendarService;
}

/**
 * It includes in-memory DelegationCredential credentials as well.
 */
export async function getUsersCredentialsIncludeServiceAccountKey(user: User) {
  const credentials = await prisma.credential.findMany({
    where: {
      userId: user.id,
    },
    select: credentialForCalendarServiceSelect,
    orderBy: {
      id: "asc",
    },
  });

  const { credentials: allCredentials } = await enrichUserWithDelegationCredentialsIncludeServiceAccountKey({
    user: {
      email: user.email,
      id: user.id,
      credentials,
    },
  });

  return allCredentials;
}

export async function getUsersCredentials(user: User) {
  const credentials = await getUsersCredentialsIncludeServiceAccountKey(user);
  return credentials.map(({ delegatedTo: _1, ...rest }) => rest);
}

/**
 * Find the credential for a selected calendar
 * @param selectedCalendar
 */
export async function getCredentialForSelectedCalendar({
  credentialId,
  delegationCredentialId,
  userId,
}: Partial<SelectedCalendar>) {
  if (credentialId) {
    const credentialRepository = new CredentialRepository(prisma);
    const credential = await credentialRepository.findByIdWithDelegationCredential(credentialId);
    if (credential?.delegationCredential?.id && credential.userId) {
      return findUniqueDelegationCalendarCredential({
        userId: credential.userId,
        delegationCredentialId: credential.delegationCredential.id,
      });
    }
    return credential ? buildNonDelegationCredential(credential) : undefined;
  }
  if (delegationCredentialId && userId) {
    return findUniqueDelegationCalendarCredential({
      userId,
      delegationCredentialId,
    });
  }
  return undefined;
}
