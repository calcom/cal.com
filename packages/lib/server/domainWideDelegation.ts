import { DomainWideDelegationRepository } from "@calcom/lib/server/repository/domainWideDelegation";
import { WorkspacePlatformRepository } from "@calcom/lib/server/repository/workspacePlatform";
import logger from "@calcom/lib/logger";
import { metadata as googleCalendarMetadata } from "@calcom/app-store/googlecalendar/_metadata";

export async function getAllDomainWideDelegationCredentialsForUser({ user }: { user: { email: string; id: number } }) {
  const log = logger.getSubLogger({ prefix: ["getAllDomainWideDelegationCredentialsForUser"] });
  const domainWideDelegation = await DomainWideDelegationRepository.findByUserIncludeSensitiveServiceAccountKey({
    user: {
      email: user.email,
    },
  });


  if (!domainWideDelegation || !domainWideDelegation.enabled) {
    return [];
  }

  const workspacePlatforms = await WorkspacePlatformRepository.findAll();

  const domainWideDelegationCredentials = workspacePlatforms
    .map((workspacePlatform) => {
      if (workspacePlatform.slug !== domainWideDelegation.workspacePlatform.slug) {
        return null;
      }

      return {
        // A negative ID confirms it isn't in DB. The code using this credential would check for -1 and use delegatedToId instead
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
      };
    })
    .filter((credential): credential is NonNullable<typeof credential> => credential !== null);

  log.silly("getAllDomainWideDelegationCredentialsForUser", { domainWideDelegationCredentials });
  return domainWideDelegationCredentials;
}

export async function getAllDomainWideDelegationCalendarCredentialsForUser({ user }: { user: { email: string; id: number } }) {
  const domainWideDelegationCredentials = await getAllDomainWideDelegationCredentialsForUser({ user });
  return domainWideDelegationCredentials.filter((credential) => credential.type.endsWith("_calendar"));
}