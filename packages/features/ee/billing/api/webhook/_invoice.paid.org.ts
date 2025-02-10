import { z } from "zod";

import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { OrganizationRepository } from "@calcom/lib/server/repository/organization";
import { OrganizationOnboardingRepository } from "@calcom/lib/server/repository/organizationOnboarding";
import { prisma } from "@calcom/prisma";
import type { Team, User } from "@calcom/prisma/client";
import { MembershipRole, CreationSource } from "@calcom/prisma/enums";
import { createTeamsHandler } from "@calcom/trpc/server/routers/viewer/organizations/createTeams.handler";
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
  const owner = await prisma.user.findUnique({
    where: { email: ownerEmail },
  });

  if (!owner) {
    throw new Error(`Owner not found with email: ${ownerEmail}`);
  }

  let organization = await OrganizationRepository.findBySlug({ slug: orgData.slug });

  if (organization) {
    logger.debug(
      `Reusing existing organization:`,
      safeStringify({
        slug: orgData.slug,
        id: organization.id,
      })
    );
    return { organization, owner };
  }

  logger.debug(`Creating organization for owner ${owner.email}`);
  try {
    const result = await OrganizationRepository.createWithExistingUserAsOwner({
      orgData,
      owner: {
        id: owner.id,
        email: owner.email,
        nonOrgUsername: owner.username || "",
      },
    });
    organization = result.organization;
  } catch (error) {
    // Catch and log so that redactError doesn't redact the log message
    logger.error(
      `RecoverableError: Error creating organization for owner ${owner.email}.`,
      safeStringify(error)
    );
    throw error;
  }

  return { organization, owner };
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

  const onboardingForm = await OrganizationOnboardingRepository.findByStripeCustomerId(invoice.customer);
  if (!onboardingForm) {
    logger.error(
      `NonRecoverableError: No onboarding record found for stripe customer id: ${invoice.customer}.`
    );
    return {
      success: false,
      error: `No onboarding record found for stripe customer id: ${invoice.customer}.`,
    };
  }

  const { organization, owner } = await createOrganizationWithOwner(
    {
      name: onboardingForm.name,
      slug: onboardingForm.slug,
      isOrganizationConfigured: true,
      isOrganizationAdminReviewed: true,
      autoAcceptEmail: onboardingForm.orgOwnerEmail.split("@")[1],
      seats: onboardingForm.seats,
      pricePerSeat: onboardingForm.pricePerSeat,
      isPlatform: false,
      billingPeriod: onboardingForm.billingPeriod,
    },
    onboardingForm.orgOwnerEmail
  );

  const invitedMembers = z
    .array(z.object({ email: z.string().email(), name: z.string().optional() }))
    .parse(onboardingForm.invitedMembers);

  const teams = z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        isBeingMigrated: z.boolean(),
        slug: z.string(),
      })
    )
    .parse(onboardingForm.teams);

  await createTeamsForOrganization(teams, owner, organization.id);
  await inviteMembers(invitedMembers, organization);

  logger.debug(`Marking onboarding as complete for organization ${organization.id}`);
  await OrganizationOnboardingRepository.markAsComplete(onboardingForm.id);

  return { success: true };
};

export default handler;
