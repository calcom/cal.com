import { lookup } from "dns";
import { type TFunction } from "i18next";

import { sendAdminOrganizationNotification } from "@calcom/emails";
import {
  RESERVED_SUBDOMAINS,
  ORG_MINIMUM_PUBLISHED_TEAMS_SELF_SERVE,
  WEBAPP_URL,
  IS_CALCOM,
} from "@calcom/lib/constants";
import { createDomain } from "@calcom/lib/domainManager/organization";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { prisma } from "@calcom/prisma";
import { UserPermissionRole } from "@calcom/prisma/enums";

const log = logger.getSubLogger({ prefix: ["orgCreationUtils"] });

/**
 * We can only say for sure that the email is not a company email. We can't say for sure if it is a company email.
 */
function isNotACompanyEmail(email: string) {
  // A list of popular @domains that can't be used to allow automatic acceptance of memberships to organization
  const emailProviders = [
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
    "aol.com",
    "icloud.com",
    "mail.com",
    "protonmail.com",
    "proton.me",
    "zoho.com",
    "yandex.com",
    "gmx.com",
    "fastmail.com",
    "inbox.com",
    "me.com",
    "hushmail.com",
    "live.com",
    "rediffmail.com",
    "tutanota.com",
    "mail.ru",
    "usa.com",
    "qq.com",
    "163.com",
    "web.de",
    "rocketmail.com",
    "excite.com",
    "lycos.com",
    "outlook.co",
    "hotmail.co.uk",
  ];

  const emailParts = email.split("@");
  if (emailParts.length < 2) return true;
  return emailProviders.includes(emailParts[1]);
}

type ConflictType =
  | "orgUserIsMemberOfExists"
  | "teamUserIsMemberOfExists"
  | "orgUserIsNotMemberOfExists"
  | "teamUserIsNotMemberOfExists"
  | null;

type OrgOwner = {
  id: number;
  email: string;
  username?: string | null;
  teams: {
    team: {
      isPlatform: boolean;
      slug: string | null;
      isOrganization: boolean;
    };
    accepted: boolean;
  }[];
  completedOnboarding?: boolean;
  emailVerified?: Date | null;
  profile?: {
    organizationId: number | null;
  } | null;
};

const getIPAddress = async (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    lookup(url, (err, address) => {
      if (err) reject(err);
      resolve(address);
    });
  });
};

export class OrgCreationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

async function assertSlugIsAvailable({
  slug,
  orgOwner,
  errorOnUserAlreadyPartOfOrg = true,
}: {
  slug: string;
  orgOwner: OrgOwner;
  errorOnUserAlreadyPartOfOrg?: boolean;
}) {
  let conflictType: ConflictType = null;

  const conflictingTeamOrOrg = await prisma.team.findFirst({
    where: {
      slug,
      parentId: null,
    },
    include: {
      members: {
        select: {
          userId: true,
          accepted: true,
        },
      },
    },
  });

  if (!conflictingTeamOrOrg) {
    return {
      conflictType,
    };
  }

  const isMemberOfConflictingTeamOrOrg = conflictingTeamOrOrg.members.some(
    (membership) => membership.userId === orgOwner.id && membership.accepted
  );
  if (conflictingTeamOrOrg.isOrganization) {
    conflictType = isMemberOfConflictingTeamOrOrg ? "orgUserIsMemberOfExists" : "orgUserIsNotMemberOfExists";
  } else {
    conflictType = isMemberOfConflictingTeamOrOrg
      ? "teamUserIsMemberOfExists"
      : "teamUserIsNotMemberOfExists";
  }

  if (conflictType === "orgUserIsNotMemberOfExists") {
    log.warn("orgUserIsNotMemberOfExists", safeStringify({ slug }));
    throw new OrgCreationError("organization_url_taken");
  } else if (conflictType === "orgUserIsMemberOfExists") {
    log.warn("you_are_part_of_this_organization_already", safeStringify({ slug }));
    if (errorOnUserAlreadyPartOfOrg) {
      throw new OrgCreationError("you_are_part_of_this_organization_already");
    }
  } else if (conflictType === "teamUserIsMemberOfExists") {
    log.debug("teamUserIsMemberOfExists", safeStringify({ slug }));
    // Allow creating the organization
    // It is needed so that later we can migrate the non-org Team(with the conflicting slug) to the newly created org
    // Publishing the organization would fail if the team with the same slug is not migrated first
  } else if (conflictType === "teamUserIsNotMemberOfExists") {
    log.error("Team with same slug already exists, owned by another user", safeStringify({ slug }));
    throw new OrgCreationError("organization_url_taken");
  }

  if (RESERVED_SUBDOMAINS.includes(slug)) {
    // Log actual reason but show regular error message to user.
    log.warn("Reserved subdomain", safeStringify({ slug }));
    throw new OrgCreationError("organization_url_taken");
  }

  return {
    conflictType,
  };
}

export async function assertCanCreateOrg({
  slug,
  isPlatform,
  orgOwner,
  restrictBasedOnMinimumPublishedTeams,
  errorOnUserAlreadyPartOfOrg = true,
}: {
  slug: string;
  isPlatform: boolean;
  orgOwner: OrgOwner;
  restrictBasedOnMinimumPublishedTeams: boolean;
  errorOnUserAlreadyPartOfOrg?: boolean;
}) {
  const verifiedUser = orgOwner.completedOnboarding && !!orgOwner.emailVerified;
  if (!verifiedUser) {
    log.warn(
      "you_need_to_complete_user_onboarding_before_creating_an_organization",
      safeStringify({ userId: orgOwner.id })
    );
    throw new OrgCreationError("you_need_to_complete_user_onboarding_before_creating_an_organization");
  }

  if (isNotACompanyEmail(orgOwner.email) && !isPlatform) {
    log.warn("use_company_email_to_create_an_organization", safeStringify({ email: orgOwner.email }));
    throw new OrgCreationError("use_company_email_to_create_an_organization");
  }

  const { conflictType: slugConflictType } = await assertSlugIsAvailable({
    slug,
    orgOwner,
    errorOnUserAlreadyPartOfOrg,
  });

  // Let slug verification be done before it as that gives better error message if the user creating the org is already a part of the org(i.e. the org exist and he is a member)
  const isPartOfAnotherOrg = !!orgOwner.profile?.organizationId;
  if (isPartOfAnotherOrg) {
    throw new OrgCreationError("you_are_part_of_another_organization_cannot_create_organization");
  }

  // for platform Organization we don't add org profile to orgOwner so we've to check membership to check if user is part of another platform organization.
  const isPartOfAnotherPlatformOrg = orgOwner.teams.some(
    (membership) => membership.team.isOrganization && membership.accepted
  );
  if (isPartOfAnotherPlatformOrg) {
    throw new OrgCreationError("you_are_part_of_another_platform_organization_cannot_create_organization");
  }

  const hasExistingPlatformOrOrgTeam = orgOwner?.teams.find((team) => {
    return team.team.isPlatform || team.team.isOrganization;
  });

  if (!!hasExistingPlatformOrOrgTeam?.team && isPlatform) {
    log.warn(
      "you_cannot_create_a_platform_organization_as_you_are_already_part_of_a_team",
      safeStringify({ userId: orgOwner.id })
    );
    throw new OrgCreationError("you_cannot_create_a_platform_organization_as_you_are_already_part_of_a_team");
  }

  const publishedTeams = orgOwner.teams.filter((team) => !!team.team.slug);

  if (
    restrictBasedOnMinimumPublishedTeams &&
    publishedTeams.length < ORG_MINIMUM_PUBLISHED_TEAMS_SELF_SERVE &&
    !isPlatform
  ) {
    log.warn(
      "you_need_to_have_minimum_published_teams",
      safeStringify({
        userId: orgOwner.id,
        publishedTeams: publishedTeams.length,
        minimumPublishedTeams: ORG_MINIMUM_PUBLISHED_TEAMS_SELF_SERVE,
      })
    );
    throw new OrgCreationError("you_need_to_have_minimum_published_teams");
  }

  return {
    slugConflictType,
  };
}

export const findUserToBeOrgOwner = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    include: {
      teams: {
        select: {
          team: {
            select: {
              slug: true,
              isOrganization: true,
              isPlatform: true,
            },
          },
          accepted: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  return await new UserRepository(prisma).enrichUserWithItsProfile({
    user,
  });
};

export const setupDomain = async ({
  slug,
  isPlatform,
  orgOwnerEmail,
  orgOwnerTranslation,
}: {
  slug: string;
  isPlatform: boolean;
  orgOwnerEmail: string;
  orgOwnerTranslation: TFunction;
}) => {
  log.debug("Starting domain setup", safeStringify({ slug, isPlatform }));
  const areDomainsConfigured = isPlatform ? true : await createDomain(slug);

  // On Cal.com, we expect the domains to be configured.
  if (IS_CALCOM && !areDomainsConfigured) {
    log.error("Failed to create domain in Vercel/Cloudflare", safeStringify({ slug }));
    throw new OrgCreationError("could_not_create_domain");
  }

  if (!areDomainsConfigured) {
    log.warn("Organization domain not configured", safeStringify({ slug }));
    // Otherwise, we proceed to send an administrative email to admins regarding
    // the need to configure DNS registry to support the newly created org
    const instanceAdmins = await prisma.user.findMany({
      where: { role: UserPermissionRole.ADMIN },
      select: { email: true },
    });
    if (instanceAdmins.length) {
      log.debug(
        "Sending admin notification for domain configuration",
        safeStringify({ slug, adminCount: instanceAdmins.length })
      );
      try {
        await sendAdminOrganizationNotification({
          instanceAdmins,
          orgSlug: slug,
          ownerEmail: orgOwnerEmail,
          webappIPAddress: await getIPAddress(
            WEBAPP_URL.replace("https://", "")?.replace("http://", "").replace(/(:.*)/, "")
          ),
          t: orgOwnerTranslation,
        });
      } catch (error) {
        // TODO: Why would this error come?
        log.error("Error sending admin notification", safeStringify({ error }));
      }
    } else {
      log.warn("Organization created: subdomain not configured and couldn't notify administrators");
    }
  } else {
    log.debug("Domain setup completed successfully", safeStringify({ slug }));
  }
};
