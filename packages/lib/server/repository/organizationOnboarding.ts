import { z } from "zod";

import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import type { BillingPeriod } from "@calcom/prisma/enums";

// Zod schemas for validation
const invitedMemberSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

const teamSchema = z.object({
  id: z.number(),
  name: z.string(),
  isBeingMigrated: z.boolean(),
  slug: z.string(),
});

export type CreateOrganizationOnboardingInput = {
  organizationId: number | null;
  billingPeriod: BillingPeriod;
  pricePerSeat: number;
  seats: number;
  orgOwnerEmail: string;
  name: string;
  slug: string;
  logo?: string;
  bio?: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  invitedMembers?: { email: string; name?: string }[];
  teams?: { id: number; name: string; isBeingMigrated: boolean; slug: string }[];
};

export class OrganizationOnboardingRepository {
  static async create(data: CreateOrganizationOnboardingInput) {
    logger.debug("Creating organization onboarding", safeStringify(data));

    // Validate invitedMembers and teams if they exist
    if (data.invitedMembers) {
      z.array(invitedMemberSchema).parse(data.invitedMembers);
    }
    if (data.teams) {
      z.array(teamSchema).parse(data.teams);
    }

    return await prisma.organizationOnboarding.create({
      data: {
        billingPeriod: data.billingPeriod,
        pricePerSeat: data.pricePerSeat,
        seats: data.seats,
        orgOwnerEmail: data.orgOwnerEmail,
        name: data.name,
        slug: data.slug,
        logo: data.logo,
        bio: data.bio,
        stripeCustomerId: data.stripeCustomerId,
        stripeSubscriptionId: data.stripeSubscriptionId,
        invitedMembers: data.invitedMembers || [],
        teams: data.teams || [],
      },
    });
  }

  static async findByStripeCustomerId(stripeCustomerId: string) {
    logger.debug(
      "Finding organization onboarding by stripe customer id",
      safeStringify({ stripeCustomerId })
    );
    return await prisma.organizationOnboarding.findUnique({
      where: {
        stripeCustomerId,
      },
    });
  }

  static async findByOrgOwnerEmail(email: string) {
    logger.debug("Finding organization onboarding by org owner email", { email });
    return await prisma.organizationOnboarding.findUnique({
      where: {
        orgOwnerEmail: email,
      },
    });
  }

  // TODO: This method should be moved to OrganizationOnboardingService
  static async markAsComplete(id: number) {
    logger.debug("Marking organization onboarding as complete", { id });
    return await prisma.organizationOnboarding.update({
      where: {
        id,
      },
      data: {
        isComplete: true,
      },
    });
  }

  static async update(id: number, data: Partial<CreateOrganizationOnboardingInput>) {
    logger.debug("Updating organization onboarding", safeStringify({ id, data }));

    // Validate invitedMembers and teams if they exist
    if (data.invitedMembers) {
      z.array(invitedMemberSchema).parse(data.invitedMembers);
    }
    if (data.teams) {
      z.array(teamSchema).parse(data.teams);
    }

    return await prisma.organizationOnboarding.update({
      where: {
        id,
      },
      data,
    });
  }

  static async setOrganizationId({ id, organizationId }: { id: number; organizationId: number }) {
    logger.debug("Setting organization id", { id, organizationId });
    return OrganizationOnboardingRepository.update(id, { organizationId });
  }

  static async delete(id: number) {
    logger.debug("Deleting organization onboarding", { id });
    return await prisma.organizationOnboarding.delete({
      where: {
        id,
      },
    });
  }
}
