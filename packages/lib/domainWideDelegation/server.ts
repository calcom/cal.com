import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { metadata as googleCalendarMetadata } from "@calcom/app-store/googlecalendar/_metadata";
import { metadata as googleMeetMetadata } from "@calcom/app-store/googlevideo/_metadata";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { DomainWideDelegationRepository } from "@calcom/lib/server/repository/domainWideDelegation";
import { WorkspacePlatformRepository } from "@calcom/lib/server/repository/workspacePlatform";

const log = logger.getSubLogger({ prefix: ["lib/domainWideDelegation/server"] });
interface DomainWideDelegation {
  id: string;
  workspacePlatform: {
    slug: string;
  };
}

interface User {
  email: string;
  id: number;
}

const buildDomainWideDelegationCalendarCredential = ({
  domainWideDelegation,
  user,
}: {
  domainWideDelegation: DomainWideDelegation;
  user: User;
}) => {
  log.debug("buildDomainWideDelegationCredential", safeStringify({ domainWideDelegation, user }));
  if (domainWideDelegation.workspacePlatform.slug !== "google") {
    return null;
  }
  return {
    id: -1,
    type: googleCalendarMetadata.type,
    delegatedToId: domainWideDelegation.id,
    appId: googleCalendarMetadata.slug,
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
  };
};

const buildDomainWideDelegationConferencingCredential = ({
  domainWideDelegation,
  user,
}: {
  domainWideDelegation: DomainWideDelegation;
  user: User;
}) => {
  if (domainWideDelegation.workspacePlatform.slug !== "google") {
    return null;
  }
  return {
    id: -1,
    type: googleMeetMetadata.type,
    delegatedToId: domainWideDelegation.id,
    appId: googleMeetMetadata.slug,
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
  };
};
export async function getAllDomainWideDelegationCredentialsForUser({
  user,
}: {
  user: { email: string; id: number };
}) {
  log.debug("called with", { user });

  const domainWideDelegation =
    await DomainWideDelegationRepository.findByUserIncludeSensitiveServiceAccountKey({
      user: {
        email: user.email,
      },
    });

  if (!domainWideDelegation || !domainWideDelegation.enabled) {
    return [];
  }

  const workspacePlatform = await WorkspacePlatformRepository.findBySlug({
    slug: domainWideDelegation.workspacePlatform.slug,
  });

  const domainWideDelegationCredentials = !!workspacePlatform
    ? [
        buildDomainWideDelegationCalendarCredential({ domainWideDelegation, user }),
        buildDomainWideDelegationConferencingCredential({ domainWideDelegation, user }),
      ]
        .flat()
        .filter((credential): credential is NonNullable<typeof credential> => credential !== null)
    : [];

  log.debug("Returned", { domainWideDelegationCredentials });
  return domainWideDelegationCredentials;
}

export async function getAllDomainWideDelegationCalendarCredentialsForUser({
  user,
}: {
  user: { email: string; id: number };
}) {
  const domainWideDelegationCredentials = await getAllDomainWideDelegationCredentialsForUser({ user });
  return domainWideDelegationCredentials.filter((credential) => credential.type.endsWith("_calendar"));
}
export async function getAllDomainWideDelegationConferencingCredentialsForUser({
  user,
}: {
  user: { email: string; id: number };
}) {
  const domainWideDelegationCredentials = await getAllDomainWideDelegationCredentialsForUser({ user });
  return domainWideDelegationCredentials.filter(
    (credential) =>
      credential.type.endsWith("_video") ||
      credential.type.endsWith("_conferencing") ||
      credential.type.endsWith("_messaging")
  );
}

export async function checkIfSuccessfullyConfiguredInWorkspace({
  domainWideDelegation,
  user,
}: {
  domainWideDelegation: DomainWideDelegation;
  user: User;
}) {
  if (domainWideDelegation.workspacePlatform.slug === "google") {
    const googleCalendar = await getCalendar(
      buildDomainWideDelegationCalendarCredential({ domainWideDelegation, user })
    );
    if (!googleCalendar) {
      throw new Error("Google Calendar App not found");
    }
    return await googleCalendar?.testDomainWideDelegationSetup?.();
  }
  return false;
}

export async function getAllDomainWideDelegationCredentialsForUserByAppType({
  user,
  appType,
}: {
  user: User;
  appType: string;
}) {
  const domainWideDelegationCredentials = await getAllDomainWideDelegationCredentialsForUser({ user });
  return domainWideDelegationCredentials.filter((credential) => credential.type === appType);
}

export async function getAllDomainWideDelegationCredentialsForUserByAppSlug({
  user,
  appSlug,
}: {
  user: User;
  appSlug: string;
}) {
  const domainWideDelegationCredentials = await getAllDomainWideDelegationCredentialsForUser({ user });
  return domainWideDelegationCredentials.filter((credential) => credential.appId === appSlug);
}
