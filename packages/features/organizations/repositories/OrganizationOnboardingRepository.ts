import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import type { BillingPeriod } from "@calcom/prisma/enums";

type OnboardingId = string;

export type CreateOrganizationOnboardingInput = {
  createdById: number;
  organizationId?: number | null;
  billingPeriod: BillingPeriod;
  pricePerSeat: number;
  seats: number;
  orgOwnerEmail: string;
  name: string;
  slug: string;
  logo?: string | null;
  bio?: string | null;
  brandColor?: string | null;
  bannerUrl?: string | null;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeSubscriptionItemId?: string;
  invitedMembers?: { email: string; name?: string }[];
  teams?: { id: number; name: string; isBeingMigrated: boolean; slug: string | null }[];
  error?: string | null;
  isDomainConfigured?: boolean;
  isComplete?: boolean;
};

export class OrganizationOnboardingRepository {
  static async create(data: CreateOrganizationOnboardingInput) {
    logger.debug("Creating organization onboarding", safeStringify(data));

    return await prisma.organizationOnboarding.create({
      // HEKOP
      data: {
        billingPeriod: data.billingPeriod,
        pricePerSeat: data.pricePerSeat,
        seats: data.seats,
        orgOwnerEmail: data.orgOwnerEmail,
        name: data.name,
        slug: data.slug,
        logo: data.logo,
        bio: data.bio,
        brandColor: data.brandColor,
        bannerUrl: data.bannerUrl,
        stripeCustomerId: data.stripeCustomerId,
        stripeSubscriptionId: data.stripeSubscriptionId,
        invitedMembers: data.invitedMembers || [],
        teams: data.teams || [],
        createdById: data.createdById,
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

  static async findById(id: OnboardingId) {
    logger.debug("Finding organization onboarding by id", safeStringify({ id }));
    return await prisma.organizationOnboarding.findUnique({
      where: {
        id,
      },
    });
  }

  static async findByOrgOwnerEmail(email: string) {
    logger.debug("Finding organization onboarding by org owner email", safeStringify({ email }));
    return await prisma.organizationOnboarding.findUnique({
      where: {
        orgOwnerEmail: email,
      },
    });
  }

  // TODO: This method should be moved to OrganizationOnboardingService
  static async markAsComplete(id: OnboardingId) {
    logger.debug("Marking organization onboarding as complete", { id });
    return await prisma.organizationOnboarding.update({
      where: {
        id,
      },
      data: {
        error: null,
        isComplete: true,
      },
    });
  }

  static async update(id: OnboardingId, data: Partial<CreateOrganizationOnboardingInput>) {
    logger.debug("Updating organization onboarding", safeStringify({ id, data }));
    // We don't want to update the createdById field in update
    const { organizationId, createdById: _, ...rest } = data;

    return await prisma.organizationOnboarding.update({
      where: {
        id,
      },
      data: {
        ...rest,
        ...(organizationId ? { organization: { connect: { id: organizationId } } } : {}),
        updatedAt: new Date(),
      },
    });
  }

  static async findByOrganizationId(organizationId: number) {
    logger.debug("Finding organization onboarding by organization id", safeStringify({ organizationId }));
    return await prisma.organizationOnboarding.findUnique({
      where: {
        organizationId,
      },
    });
  }

  static async findAllBySlug(slug: string) {
    logger.debug("Finding all organization onboardings by slug", safeStringify({ slug }));
    return await prisma.organizationOnboarding.findMany({
      where: {
        slug,
      },
    });
  }
  static async delete(id: OnboardingId) {
    logger.debug("Deleting organization onboarding", { id });
    return await prisma.organizationOnboarding.delete({
      where: {
        id,
      },
    });
  }
}
