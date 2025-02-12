import { z } from "zod";

import { sendOrganizationCreationEmail } from "@calcom/emails/email-manager";
import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";
import { DEFAULT_SCHEDULE } from "@calcom/lib/availability";
import { getAvailabilityFromSchedule } from "@calcom/lib/availability";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server/i18n";
import { OrganizationRepository } from "@calcom/lib/server/repository/organization";
import { OrganizationOnboardingRepository } from "@calcom/lib/server/repository/organizationOnboarding";
import { prisma } from "@calcom/prisma";
import type { Team, User } from "@calcom/prisma/client";
import { MembershipRole, CreationSource } from "@calcom/prisma/enums";
import { createTeamsHandler } from "@calcom/trpc/server/routers/viewer/organizations/createTeams.handler";
import {
  assertCanCreateOrg,
  findUserToBeOrgOwner,
  setupDomain,
} from "@calcom/trpc/server/routers/viewer/organizations/intentToCreateOrg.handler";
import { inviteMembersWithNoInviterPermissionCheck } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/inviteMember.handler";

import type { SWHMap } from "./__handler";

// Types for organization data
type OrganizationData = {
  name: string;
  slug: string;
  isOrganizationConfigured: boolean;
  isOrganizationAdminReviewed: boolean;
  autoAcceptEmail: string;
  seats: number | null;
  pricePerSeat: number | null;
  isPlatform: boolean;
  billingPeriod?: "MONTHLY" | "ANNUALLY";
};

type TeamData = {
  id: number;
  name: string;
  isBeingMigrated: boolean;
  slug: string;
};

type InvitedMember = {
  email: string;
  name?: string;
};

const invoicePaidSchema = z.object({
  object: z.object({
    customer: z.string(),
    subscription: z.string(),
  }),
});

async function createOrganizationWithOwner(orgData: OrganizationData, ownerEmail: string) {
  const owner = await findUserToBeOrgOwner(ownerEmail);

  if (!owner) {
    throw new Error(`Owner not found with email: ${ownerEmail}`);
  }
  const orgOwnerTranslation = await getTranslation(owner.locale || "en", "common");
  let organization = await OrganizationRepository.findBySlug({ slug: orgData.slug });

  if (organization) {
    logger.debug(
      `Reusing existing organization:`,
      safeStringify({
        slug: orgData.slug,
        id: organization.id,
      })
    );
    return { organization, owner, orgOwnerTranslation };
  }

  await assertCanCreateOrg({
    slug: orgData.slug,
    isPlatform: orgData.isPlatform,
    orgOwner: owner,
    // If it would have been restricted, then it would have been done already in intentToCreateOrgHandler
    restrictBasedOnMinimumPublishedTeams: true,
  });

  logger.debug(`Creating organization for owner ${owner.email}`);

  try {
    const nonOrgUsername = owner.username || "";
    const result = await OrganizationRepository.createWithExistingUserAsOwner({
      orgData,
      owner: {
        id: owner.id,
        email: owner.email,
        nonOrgUsername,
      },
    });
    organization = result.organization;
    const ownerProfile = result.ownerProfile;

    // Send organization creation email
    if (!orgData.isPlatform) {
      await sendOrganizationCreationEmail({
        language: orgOwnerTranslation,
        from: `${organization.name}'s admin`,
        to: ownerEmail,
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
    logger.error(
      `RecoverableError: Error creating organization for owner ${owner.email}.`,
      safeStringify(error)
    );
    throw error;
  }

  return { organization, owner, orgOwnerTranslation };
}

async function createTeamsForOrganization(teams: TeamData[], owner: User, organizationId: number) {
  if (teams.length === 0) return;

  logger.debug(`Creating ${teams.length} teams for organization ${organizationId}`);

  const teamsToCreate = teams.filter((team) => !team.isBeingMigrated).map((team) => team.name);
  const teamsToMove = teams
    .filter((team) => team.isBeingMigrated)
    .map((team) => ({
      id: team.id,
      newSlug: team.slug,
      shouldMove: true,
    }));

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
      creationSource: CreationSource.WEBAPP,
    },
  });
}

async function inviteMembers(invitedMembers: InvitedMember[], organization: Team) {
  if (invitedMembers.length === 0) return;

  logger.debug(`Inviting ${invitedMembers.length} members to organization ${organization.id}`);
  await inviteMembersWithNoInviterPermissionCheck({
    inviterName: null,
    team: {
      ...organization,
      parent: null,
    },
    language: "en",
    creationSource: CreationSource.WEBAPP,
    orgSlug: organization.slug || null,
    invitations: invitedMembers.map((member) => ({
      usernameOrEmail: member.email,
      role: MembershipRole.MEMBER,
    })),
  });
}

const handler = async (data: SWHMap["invoice.paid"]["data"]) => {
  const { object: invoice } = invoicePaidSchema.parse(data);
  logger.debug(`Processing invoice paid webhook for customer ${invoice.customer}`);

  const organizationOnboarding = await OrganizationOnboardingRepository.findByStripeCustomerId(
    invoice.customer
  );
  if (!organizationOnboarding) {
    logger.error(
      `NonRecoverableError: No onboarding record found for stripe customer id: ${invoice.customer}.`
    );
    return {
      success: false,
      error: `No onboarding record found for stripe customer id: ${invoice.customer}.`,
    };
  }

  const { organization, owner, orgOwnerTranslation } = await createOrganizationWithOwner(
    {
      name: organizationOnboarding.name,
      slug: organizationOnboarding.slug,
      isOrganizationConfigured: true,
      isOrganizationAdminReviewed: true,
      autoAcceptEmail: organizationOnboarding.orgOwnerEmail.split("@")[1],
      seats: organizationOnboarding.seats,
      pricePerSeat: organizationOnboarding.pricePerSeat,
      isPlatform: false,
      billingPeriod: organizationOnboarding.billingPeriod,
    },
    organizationOnboarding.orgOwnerEmail
  );

  await setupDomain({
    slug: organizationOnboarding.slug,
    isPlatform: organizationOnboarding.isPlatform,
    orgOwnerEmail: organizationOnboarding.orgOwnerEmail,
    orgOwnerTranslation,
  });

  const invitedMembers = z
    .array(z.object({ email: z.string().email(), name: z.string().optional() }))
    .parse(organizationOnboarding.invitedMembers);

  const teams = z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        isBeingMigrated: z.boolean(),
        slug: z.string(),
      })
    )
    .parse(organizationOnboarding.teams);

  await createTeamsForOrganization(teams, owner, organization.id);
  await inviteMembers(invitedMembers, organization);

  logger.debug(`Marking onboarding as complete for organization ${organization.id}`);
  await OrganizationOnboardingRepository.markAsComplete(organizationOnboarding.id);

  return { success: true };
};

export default handler;
