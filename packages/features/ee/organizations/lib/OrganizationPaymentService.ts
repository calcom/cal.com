import { StripeBillingService } from "@calcom/features/ee/billing/stripe-billling-service";
import {
  ORGANIZATION_SELF_SERVE_MIN_SEATS,
  ORGANIZATION_SELF_SERVE_PRICE,
  WEBAPP_URL,
} from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import type { BillingPeriod } from "@calcom/prisma/enums";
import { userMetadata } from "@calcom/prisma/zod-utils";
import { TRPCError } from "@calcom/trpc";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { OrganizationPermissionService } from "./OrganizationPermissionService";

type CreatePaymentIntentInput = {
  name: string;
  slug: string;
  orgOwnerEmail: string;
  billingPeriod?: BillingPeriod;
  seats?: number | null;
  pricePerSeat?: number | null;
  teams?: { id: number; isBeingMigrated: boolean; slug: string | null; name: string }[];
  invitedMembers?: { email: string }[];
};

type PaymentConfig = {
  billingPeriod: BillingPeriod;
  seats: number;
  pricePerSeat: number;
};

type StripePrice = {
  priceId: string;
  isCustom: boolean;
};

export class OrganizationPaymentService {
  protected billingService: StripeBillingService;
  protected permissionService: OrganizationPermissionService;
  protected user: NonNullable<TrpcSessionUser>;

  constructor(user: NonNullable<TrpcSessionUser>, permissionService?: OrganizationPermissionService) {
    this.billingService = new StripeBillingService();
    this.permissionService = permissionService || new OrganizationPermissionService(user);
    this.user = user;
  }

  protected async getOrCreateStripeCustomerId(email: string) {
    const existingCustomer = await prisma.user.findUnique({
      where: { email },
      select: { metadata: true },
    });

    const userParsed = existingCustomer?.metadata ? userMetadata.parse(existingCustomer.metadata) : undefined;

    if (userParsed?.stripeCustomerId) {
      return userParsed.stripeCustomerId;
    }

    const customer = await this.billingService.createCustomer({
      email,
      metadata: {
        email,
      },
    });
    return customer.stripeCustomerId;
  }

  protected normalizePaymentConfig(input: {
    billingPeriod?: BillingPeriod;
    seats?: number | null;
    pricePerSeat?: number | null;
  }): PaymentConfig {
    return {
      billingPeriod: input.billingPeriod || "MONTHLY",
      seats: input.seats || Number(ORGANIZATION_SELF_SERVE_MIN_SEATS),
      pricePerSeat: input.pricePerSeat || Number(ORGANIZATION_SELF_SERVE_PRICE),
    };
  }

  protected async getUniqueTeamMembersCount(teamIds: number[]) {
    if (!teamIds.length) return 0;

    const memberships = await prisma.membership.findMany({
      where: {
        teamId: {
          in: teamIds,
        },
      },
      select: {
        userId: true,
        user: {
          select: {
            email: true,
          },
        },
      },
      distinct: ["userId"],
    });

    return memberships.length;
  }

  protected async createOrganizationOnboarding(
    input: CreatePaymentIntentInput,
    config: PaymentConfig,
    stripeCustomerId: string
  ) {
    const teamsToMigrate = input.teams?.filter((team) => team.id === -1 || team.isBeingMigrated) || [];
    const teamIds = teamsToMigrate.filter((team) => team.id > 0).map((team) => team.id);

    // Get unique members count from existing teams
    const uniqueMembersCount = await this.getUniqueTeamMembersCount(teamIds);

    // Create new config with updated seats if necessary
    const updatedConfig = {
      ...config,
      seats: Math.max(config.seats, uniqueMembersCount),
    };

    // Try to find an existing incomplete onboarding with matching slug
    const existingOnboarding = await prisma.organizationOnboarding.findFirst({
      where: {
        orgOwnerEmail: input.orgOwnerEmail,
        slug: input.slug,
      },
    });

    if (existingOnboarding?.isComplete) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        // TODO: Consider redirecting to the organization settings page or maybe confirm if org exists and then redirect to the success page.
        // If any error in creatng the organization, that must be shown there and user can fix that maybe
        message: "Organization onboarding is already complete",
      });
    }

    if (existingOnboarding) {
      // Update the existing onboarding with new data
      return await prisma.organizationOnboarding.update({
        where: { id: existingOnboarding.id },
        data: {
          name: input.name,
          billingPeriod: updatedConfig.billingPeriod,
          pricePerSeat: updatedConfig.pricePerSeat,
          seats: updatedConfig.seats,
          stripeCustomerId,
          invitedMembers: input.invitedMembers,
          teams: teamsToMigrate,
          updatedAt: new Date(),
        },
      });
    }

    // Create new onboarding record if none exists
    return await prisma.organizationOnboarding.create({
      data: {
        name: input.name,
        slug: input.slug,
        orgOwnerEmail: input.orgOwnerEmail,
        billingPeriod: updatedConfig.billingPeriod,
        seats: updatedConfig.seats,
        pricePerSeat: updatedConfig.pricePerSeat,
        stripeCustomerId,
        invitedMembers: input.invitedMembers,
        teams: teamsToMigrate,
      },
    });
  }

  protected async getOrCreatePrice(
    config: PaymentConfig,
    organizationOnboardingId: number,
    shouldCreateCustomPrice: boolean
  ): Promise<StripePrice> {
    if (!shouldCreateCustomPrice) {
      return {
        priceId: process.env.STRIPE_ORG_MONTHLY_PRICE_ID!,
        isCustom: false,
      };
    }

    const customPrice = await this.billingService.createPrice({
      amount: config.pricePerSeat * 100,
      currency: "usd",
      interval: config.billingPeriod.toLowerCase() as "month" | "year",
      nickname: `Custom Organization Price - ${config.pricePerSeat} per seat`,
      metadata: {
        organizationOnboardingId,
        pricePerSeat: config.pricePerSeat,
        billingPeriod: config.billingPeriod,
        createdAt: new Date().toISOString(),
      },
    });

    return {
      priceId: customPrice.priceId,
      isCustom: true,
    };
  }

  protected async createSubscription(
    stripeCustomerId: string,
    priceId: string,
    config: PaymentConfig,
    organizationOnboardingId: number
  ) {
    return this.billingService.createSubscriptionCheckout({
      customerId: stripeCustomerId,
      successUrl: `${WEBAPP_URL}/settings/organizations/new/payment-status?session_id={CHECKOUT_SESSION_ID}&paymentStatus=success`,
      cancelUrl: `${WEBAPP_URL}/settings/organizations/new/payment-status?session_id={CHECKOUT_SESSION_ID}&paymentStatus=failed`,
      priceId,
      quantity: config.seats,
      metadata: {
        organizationOnboardingId,
        seats: config.seats,
        pricePerSeat: config.pricePerSeat,
        billingPeriod: config.billingPeriod,
      },
    });
  }

  protected async validatePermissions(input: CreatePaymentIntentInput): Promise<boolean> {
    return this.permissionService.validatePermissions({
      orgOwnerEmail: input.orgOwnerEmail,
      teams: input.teams,
      billingPeriod: input.billingPeriod,
      seats: input.seats,
      pricePerSeat: input.pricePerSeat,
      slug: input.slug,
    });
  }

  async createPaymentIntent(input: CreatePaymentIntentInput) {
    await this.permissionService.validatePermissions(input);

    const shouldCreateCustomPrice =
      this.permissionService.hasPermissionToModifyDefaultPayment() &&
      this.permissionService.hasModifiedDefaultPayment(input);

    // We know admin permissions have been validated in the above step so we can safely normalize the input
    const paymentConfig = this.normalizePaymentConfig(input);

    const stripeCustomerId = await this.getOrCreateStripeCustomerId(input.orgOwnerEmail);

    const organizationOnboarding = await this.createOrganizationOnboarding(
      input,
      paymentConfig,
      stripeCustomerId
    );

    const { priceId } = await this.getOrCreatePrice(
      paymentConfig,
      organizationOnboarding.id,
      shouldCreateCustomPrice
    );

    const subscription = await this.createSubscription(
      stripeCustomerId,
      priceId,
      paymentConfig,
      organizationOnboarding.id
    );

    return {
      organizationOnboarding,
      checkoutUrl: subscription.checkoutUrl,
      sessionId: subscription.sessionId,
    };
  }
}
