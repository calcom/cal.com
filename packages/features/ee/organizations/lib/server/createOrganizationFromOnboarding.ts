import type { TFunction } from "i18next";

import { LicenseKeySingleton } from "@calcom/ee/common/server/LicenseKeyService";
import { sendOrganizationCreationEmail } from "@calcom/emails/email-manager";
import { sendEmailVerification } from "@calcom/features/auth/lib/verifyEmail";
import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";
import {
  assertCanCreateOrg,
  findUserToBeOrgOwner,
  setupDomain,
} from "@calcom/features/ee/organizations/lib/server/orgCreationUtils";
import { DEFAULT_SCHEDULE } from "@calcom/lib/availability";
import { getAvailabilityFromSchedule } from "@calcom/lib/availability";
import { IS_SELF_HOSTED } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server/i18n";
import { DeploymentRepository } from "@calcom/lib/server/repository/deployment";
import { OrganizationRepository } from "@calcom/features/ee/organizations/repositories/OrganizationRepository";
import { OrganizationOnboardingRepository } from "@calcom/lib/server/repository/organizationOnboarding";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import slugify from "@calcom/lib/slugify";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { Team, User } from "@calcom/prisma/client";
import type { OrganizationOnboarding } from "@calcom/prisma/client";
import { MembershipRole, CreationSource } from "@calcom/prisma/enums";
import {
  userMetadata,
  orgOnboardingInvitedMembersSchema,
  orgOnboardingTeamsSchema,
} from "@calcom/prisma/zod-utils";
import { teamMetadataStrictSchema } from "@calcom/prisma/zod-utils";
import { createTeamsHandler } from "@calcom/trpc/server/routers/viewer/organizations/createTeams.handler";
import { inviteMembersWithNoInviterPermissionCheck } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/inviteMember.handler";

// Onboarding can only be done from webapp currently and so we consider the source for User as WEBAPP
const creationSource = CreationSource.WEBAPP;
const log = logger.getSubLogger({ prefix: ["createOrganizationFromOnboarding"] });
// Types for organization data
type OrganizationData = {
  id: number | null;
  name: string;
  slug: string;
  isOrganizationConfigured: boolean;
  isOrganizationAdminReviewed: boolean;
  autoAcceptEmail: string;
  seats: number | null;
  pricePerSeat: number | null;
  isPlatform: boolean;
  logoUrl: string | null;
  bio: string | null;
  billingPeriod?: "MONTHLY" | "ANNUALLY";
};

type TeamData = {
  id: number;
  name: string;
  isBeingMigrated: boolean;
  slug: string | null;
};

type InvitedMember = {
  email: string;
  name?: string;
};

type OrgOwner = Awaited<ReturnType<typeof findUserToBeOrgOwner>>;

type OrganizationOnboardingArg = Pick<
  OrganizationOnboarding,
  | "id"
  | "organizationId"
  | "name"
  | "slug"
  | "orgOwnerEmail"
  | "seats"
  | "pricePerSeat"
  | "billingPeriod"
  | "invitedMembers"
  | "teams"
  | "isPlatform"
  | "logo"
  | "bio"
  | "stripeCustomerId"
  | "isDomainConfigured"
>;

const invitedMembersSchema = orgOnboardingInvitedMembersSchema;
const teamsSchema = orgOnboardingTeamsSchema;

async function createOrganizationWithExistingUserAsOwner({
  owner,
  orgData,
}: {
  owner: NonNullable<Awaited<ReturnType<typeof findUserToBeOrgOwner>>>;
  orgData: OrganizationData;
}) {
  const orgOwnerTranslation = await getTranslation(owner.locale || "en", "common");
  // We prefer ID which would be available if it is a retry of createOrganizationFromOnboarding and earlier organization was created and connected with Onboarding
  let organization = orgData.id ? await OrganizationRepository.findById({ id: orgData.id }) : null;

  if (organization) {
    log.info(
      `Reusing existing organization:`,
      safeStringify({
        slug: orgData.slug,
        id: organization.id,
      })
    );
    return { organization };
  }

  const { slugConflictType } = await assertCanCreateOrg({
    slug: orgData.slug,
    isPlatform: orgData.isPlatform,
    orgOwner: owner,
    errorOnUserAlreadyPartOfOrg: false,
    // If it would have been restricted, then it would have been done already in intentToCreateOrgHandler
    // This restriction doesn't apply for admin as we would have validated it already in intentToCreateOrgHandler, we just relax it here as we don't know who created the organization.
    // TODO: If needed, we could start tracking if the onboarding is being done by instance Admin and relax it then only.
    restrictBasedOnMinimumPublishedTeams: false,
  });

  // In this case we create the organization with slug=null. Let the teams migrate and then the conflict would go away.
  const canSetSlug = slugConflictType === "teamUserIsMemberOfExists" ? false : true;

  log.info(
    `Creating organization for owner ${owner.email} with slug ${orgData.slug} and canSetSlug=${canSetSlug}`
  );

  try {
    const nonOrgUsername = owner.username || "";
    const orgCreationResult = await OrganizationRepository.createWithExistingUserAsOwner({
      orgData: {
        ...orgData,
        ...(canSetSlug ? { slug: orgData.slug } : { slug: null, requestedSlug: orgData.slug }),
      },
      owner: {
        id: owner.id,
        email: owner.email,
        nonOrgUsername,
      },
    });
    organization = orgCreationResult.organization;
    const ownerProfile = orgCreationResult.ownerProfile;

    // Send organization creation email
    if (!orgData.isPlatform) {
      await sendOrganizationCreationEmail({
        language: orgOwnerTranslation,
        from: `${organization.name}'s admin`,
        to: owner.email,
        ownerNewUsername: ownerProfile.username,
        ownerOldUsername: nonOrgUsername,
        orgDomain: getOrgFullOrigin(orgData.slug, { protocol: false }),
        orgName: organization.name,
        prevLink: `${getOrgFullOrigin("", { protocol: true })}/${owner.username || ""}`,
        newLink: `${getOrgFullOrigin(orgData.slug, { protocol: true })}/${ownerProfile.username}`,
      });
    }

    // Set up default availability
    const availability = getAvailabilityFromSchedule(DEFAULT_SCHEDULE);
    await prisma.availability.createMany({
      data: availability.map((schedule) => ({
        days: schedule.days,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        userId: owner.id,
      })),
    });
  } catch (error) {
    // Catch and log so that redactError doesn't redact the log message
    log.error(
      `RecoverableError: Error creating organization for owner ${owner.email}.`,
      safeStringify(error)
    );
    throw error;
  }

  return { organization };
}

async function createOrganizationWithNonExistentUserAsOwner({
  email,
  orgData,
}: {
  email: string;
  orgData: OrganizationData;
}) {
  let organization = orgData.id
    ? await OrganizationRepository.findById({ id: orgData.id })
    : await OrganizationRepository.findBySlug({ slug: orgData.slug });

  if (organization) {
    log.info(
      `createOrganizationWithNonExistentUserAsOwner: Reusing existing organization:`,
      safeStringify({ slug: orgData.slug, id: organization.id })
    );
    const owner = await findUserToBeOrgOwner(email);
    if (!owner) {
      // Can happen when the organization was created earlier and the webhook had failed and when the webhook got fired again in next subscription update, then the email was deleted already
      // The fix would be to change the email in Onboarding record to new owner of the organization
      // TODO: Identify the owner of the organization from Membership table and use that email instead here.
      throw new Error(`Org exists but owner could not be found for email: ${email}`);
    }
    return { organization, owner };
  }

  const orgCreationResult = await OrganizationRepository.createWithNonExistentOwner({
    orgData,
    owner: {
      email: email,
    },
    creationSource,
  });
  organization = orgCreationResult.organization;
  const { ownerProfile, orgOwner: orgOwnerFromCreation } = orgCreationResult;
  const orgOwner = await findUserToBeOrgOwner(orgOwnerFromCreation.email);
  if (!orgOwner) {
    throw new Error(
      `Just created the owner ${orgOwnerFromCreation.email}, but couldn't find it in the database`
    );
  }

  const translation = await getTranslation(orgOwner.locale ?? "en", "common");

  await sendEmailVerification({
    email: orgOwner.email,
    language: orgOwner.locale ?? "en",
    username: ownerProfile.username || "",
    isPlatform: orgData.isPlatform,
  });

  if (!orgData.isPlatform) {
    await sendOrganizationCreationEmail({
      language: translation,
      from: orgOwner.name ?? `${organization.name}'s admin`,
      to: orgOwner.email,
      ownerNewUsername: ownerProfile.username,
      ownerOldUsername: null,
      orgDomain: getOrgFullOrigin(orgData.slug, { protocol: false }),
      orgName: organization.name,
      prevLink: null,
      newLink: `${getOrgFullOrigin(orgData.slug, { protocol: true })}/${ownerProfile.username}`,
    });
  }

  return {
    organization,
    owner: orgOwner,
  };
}

async function createOrMoveTeamsToOrganization(teams: TeamData[], owner: User, organizationId: number) {
  if (teams.length === 0) return;

  const teamsToCreate = teams.filter((team) => !team.isBeingMigrated).map((team) => team.name);
  const teamsToMove = teams
    .filter((team) => team.isBeingMigrated)
    .map((team) => ({
      id: team.id,
      newSlug: team.slug ? slugify(team.slug) : team.slug,
      shouldMove: true,
    }));

  log.info(
    `Creating ${teamsToCreate} teams and moving ${teamsToMove.map(
      (team) => team.newSlug
    )} teams for organization ${organizationId}`
  );

  await createTeamsHandler({
    ctx: {
      user: {
        ...owner,
        organizationId,
      },
    },
    input: {
      teamNames: teamsToCreate,
      orgId: organizationId,
      moveTeams: teamsToMove,
      creationSource,
    },
  });

  log.info(
    `Created ${teamsToCreate.length} teams and moved ${teamsToMove.length} teams for organization ${organizationId}`
  );
}

async function inviteMembers(invitedMembers: InvitedMember[], organization: Team) {
  if (invitedMembers.length === 0) return;

  log.info(`Inviting ${invitedMembers.length} members to organization ${organization.id}`);
  await inviteMembersWithNoInviterPermissionCheck({
    inviterName: null,
    teamId: organization.id,
    language: "en",
    creationSource: CreationSource.WEBAPP,
    orgSlug: organization.slug || null,
    invitations: invitedMembers.map((member) => ({
      usernameOrEmail: member.email,
      role: MembershipRole.MEMBER,
    })),
    isDirectUserAction: false,
  });
}

async function ensureStripeCustomerIdIsUpdated({
  owner,
  stripeCustomerId,
}: {
  owner: User;
  stripeCustomerId: string;
}) {
  const parsedMetadata = userMetadata.parse(owner.metadata);

  await new UserRepository(prisma).updateStripeCustomerId({
    id: owner.id,
    stripeCustomerId: stripeCustomerId,
    existingMetadata: parsedMetadata,
  });
}

/**
 * Temporary till we adapt all other code reading from metadata about stripeSubscriptionId and stripeSubscriptionItemId
 */
async function backwardCompatibilityForSubscriptionDetails({
  organization,
  paymentSubscriptionId,
  paymentSubscriptionItemId,
}: {
  organization: {
    id: number;
    metadata: Prisma.JsonValue;
  };
  paymentSubscriptionId?: string;
  paymentSubscriptionItemId?: string;
}) {
  if (!paymentSubscriptionId || !paymentSubscriptionItemId) {
    return organization;
  }

  const existingMetadata = teamMetadataStrictSchema.parse(organization.metadata);
  const updatedOrganization = await OrganizationRepository.updateStripeSubscriptionDetails({
    id: organization.id,
    stripeSubscriptionId: paymentSubscriptionId,
    stripeSubscriptionItemId: paymentSubscriptionItemId,
    existingMetadata,
  });
  return updatedOrganization;
}

async function hasConflictingOrganization({ slug, onboardingId }: { slug: string; onboardingId: string }) {
  const organization = await OrganizationRepository.findBySlugIncludeOnboarding({ slug });
  if (!organization?.organizationOnboarding) {
    // Old organizations created without onboarding,
    return false;
  }

  // Different onboardingId means existing organization is owned by someone else
  return organization.organizationOnboarding.id !== onboardingId;
}

async function handleDomainSetup({
  organizationOnboarding,
  orgOwnerTranslation,
}: {
  organizationOnboarding: OrganizationOnboardingArg;
  orgOwnerTranslation: TFunction;
}) {
  if (!organizationOnboarding.isDomainConfigured) {
    // Important: Setup Domain first before creating the organization as Vercel/Cloudflare might not allow the domain to be created and that could cause organization booking pages to not actually work
    await setupDomain({
      slug: organizationOnboarding.slug,
      isPlatform: organizationOnboarding.isPlatform,
      orgOwnerEmail: organizationOnboarding.orgOwnerEmail,
      orgOwnerTranslation,
    });
  }

  await OrganizationOnboardingRepository.update(organizationOnboarding.id, {
    isDomainConfigured: true,
  });
}

async function handleOrganizationCreation({
  organizationOnboarding,
  owner,
  paymentSubscriptionId,
  paymentSubscriptionItemId,
}: {
  organizationOnboarding: OrganizationOnboardingArg;
  owner: OrgOwner;
  paymentSubscriptionId?: string;
  paymentSubscriptionItemId?: string;
}) {
  if (IS_SELF_HOSTED) {
    const deploymentRepo = new DeploymentRepository(prisma);
    const licenseKeyService = await LicenseKeySingleton.getInstance(deploymentRepo);
    const hasValidLicense = await licenseKeyService.checkLicense();

    if (!hasValidLicense) {
      throw new Error("Self hosted license not valid");
    }
  }

  let organization;
  const orgData = {
    id: organizationOnboarding.organizationId,
    name: organizationOnboarding.name,
    // Create organization with slug=null, so that org slug doesn't conflict with existing team that is probably being migrated and thus would not be a conflict any more
    // Remember one can have a subteam with same slug as some organization, but regular team and organization can't have same slug
    slug: organizationOnboarding.slug,
    isOrganizationConfigured: true,
    // We believe that as the payment has been accepted first and we also restrict the emails to company emails, it is safe to set this to true.
    // We could easily set it to false if needed. In effect, it disables impersonations by non-admin reviewed organization's owner and also disables editing the member details
    isOrganizationAdminReviewed: true,
    autoAcceptEmail: organizationOnboarding.orgOwnerEmail.split("@")[1],
    seats: organizationOnboarding.seats,
    pricePerSeat: organizationOnboarding.pricePerSeat,
    isPlatform: false,
    billingPeriod: organizationOnboarding.billingPeriod,
    logoUrl: organizationOnboarding.logo,
    bio: organizationOnboarding.bio,
  };

  log.info(
    "handleOrganizationCreation",
    safeStringify({ orgId: organizationOnboarding.organizationId, orgSlug: organizationOnboarding.slug })
  );
  if (!owner) {
    const result = await createOrganizationWithNonExistentUserAsOwner({
      email: organizationOnboarding.orgOwnerEmail,
      orgData,
    });
    organization = result.organization;
    owner = result.owner;
  } else {
    const result = await createOrganizationWithExistingUserAsOwner({
      orgData,
      owner,
    });
    organization = result.organization;
  }

  if (organizationOnboarding.stripeCustomerId) {
    // Mostly needed for newly created user through the flow, existing user would have it already when checkout was created
    // We need to set it there to ensure that for the same user new customerId is not created again
    await ensureStripeCustomerIdIsUpdated({
      owner,
      stripeCustomerId: organizationOnboarding.stripeCustomerId,
    });
  }

  // Connect the organization to the onboarding
  await OrganizationOnboardingRepository.update(organizationOnboarding.id, {
    organizationId: organization.id,
  });

  const updatedOrganization = await backwardCompatibilityForSubscriptionDetails({
    organization,
    paymentSubscriptionId,
    paymentSubscriptionItemId,
  });

  return {
    organization: {
      ...organization,
      metadata: updatedOrganization.metadata,
    },
    owner,
  };
}

/**
 * This function is used by stripe webhook, so it should expect to be called multiple times till the entire flow completes without any error.
 * So, it should be idempotent.
 */
export const createOrganizationFromOnboarding = async ({
  organizationOnboarding,
  paymentSubscriptionId,
  paymentSubscriptionItemId,
}: {
  organizationOnboarding: OrganizationOnboardingArg;
  paymentSubscriptionId?: string;
  paymentSubscriptionItemId?: string;
}) => {
  log.info(
    "createOrganizationFromOnboarding",
    safeStringify({
      orgId: organizationOnboarding.organizationId,
      orgSlug: organizationOnboarding.slug,
    })
  );

  if (!IS_SELF_HOSTED && (!paymentSubscriptionId || !paymentSubscriptionItemId)) {
    throw new Error("payment_subscription_id_and_payment_subscription_item_id_are_required");
  }

  if (
    await hasConflictingOrganization({
      slug: organizationOnboarding.slug,
      onboardingId: organizationOnboarding.id,
    })
  ) {
    throw new Error("organization_already_exists_with_this_slug");
  }

  // We know admin permissions have been validated in the above step so we can safely normalize the input
  const userFromEmail = await findUserToBeOrgOwner(organizationOnboarding.orgOwnerEmail);
  const orgOwnerTranslation = await getTranslation(userFromEmail?.locale || "en", "common");

  // TODO: We need to send emails to admin in the case of SELF_HOSTING where NEXT_PUBLIC_SINGLE_ORG_SLUG isn't set
  if (!process.env.NEXT_PUBLIC_SINGLE_ORG_SLUG) {
    await handleDomainSetup({
      organizationOnboarding,
      orgOwnerTranslation,
    });
  }

  const { organization, owner } = await handleOrganizationCreation({
    organizationOnboarding,
    owner: userFromEmail,
    paymentSubscriptionId,
    paymentSubscriptionItemId,
  });

  await inviteMembers(invitedMembersSchema.parse(organizationOnboarding.invitedMembers), organization);

  await createOrMoveTeamsToOrganization(
    teamsSchema.parse(organizationOnboarding.teams),
    owner,
    organization.id
  );

  // If the organization was created with slug=null, then set the slug now, assuming that the team having the same slug is migrated now
  // If the team wasn't owned by the orgOwner, then org creation would have failed and we wouldn't be here
  if (!organization.slug) {
    try {
      const { slug } = await OrganizationRepository.setSlug({
        id: organization.id,
        slug: organizationOnboarding.slug,
      });
      organization.slug = slug;
    } catch (error) {
      // Almost always the reason would be that the organization's slug conflicts with a team's slug
      // The owner might not have chosen the conflicting team for migration - Can be confirmed by checking `teams` column in the database.
      log.error(
        "RecoverableError: Error while setting slug for organization",
        safeStringify(error),
        safeStringify({
          attemptedSlug: organizationOnboarding.slug,
          organizationId: organization.id,
        })
      );
      throw new Error(
        `Unable to set slug '${organizationOnboarding.slug}' for organization ${organization.id}`
      );
    }
  }

  return { organization, owner };
};
