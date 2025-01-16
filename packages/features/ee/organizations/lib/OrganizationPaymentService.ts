import { StripeBillingService } from "@calcom/features/ee/billing/stripe-billling-service";
import {
  ORGANIZATION_SELF_SERVE_MIN_SEATS,
  ORGANIZATION_SELF_SERVE_PRICE,
  WEBAPP_URL,
} from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import { userMetadata } from "@calcom/prisma/zod-utils";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

type CreatePaymentIntentInput = {
  name: string;
  slug: string;
  orgOwnerEmail: string;
  billingPeriod?: string;
  seats?: number;
  pricePerSeat?: number;
  teams?: { id: number; isBeingMigrated: boolean; slug: string; name: string }[];
  invitedMembers?: { email: string }[];
};

type PaymentConfig = {
  billingPeriod: string;
  seats: number;
  pricePerSeat: number;
};

type StripePrice = {
  priceId: string;
  isCustom: boolean;
};

export class OrganizationPaymentService {
  protected billingService: StripeBillingService;
  protected user: NonNullable<TrpcSessionUser>;

  constructor(user: NonNullable<TrpcSessionUser>) {
    this.billingService = new StripeBillingService();
    this.user = user;
  }

  protected hasPermissionToCreateForEmail(targetEmail: string) {
    if (this.user.role === "ADMIN") {
      return true;
    }
    return this.user.email === targetEmail;
  }

  protected async hasPendingOrganizations(email: string) {
    if (this.user.role === "ADMIN") {
      return false;
    }

    const pendingOrganization = await prisma.organizationOnboarding.findFirst({
      where: {
        orgOwnerEmail: email,
        isComplete: false,
      },
    });

    return !!pendingOrganization;
  }

  protected hasPermissionToModifyDefaultPayment() {
    return this.user.role === "ADMIN";
  }

  protected hasModifiedDefaultPayment(input: Partial<PaymentConfig>) {
    return (
      (input.billingPeriod !== undefined && input.billingPeriod !== "MONTHLY") ||
      (input.seats !== undefined && input.seats !== ORGANIZATION_SELF_SERVE_MIN_SEATS) ||
      (input.pricePerSeat !== undefined && input.pricePerSeat !== ORGANIZATION_SELF_SERVE_PRICE)
    );
  }

  protected async hasPermissionToMigrateTeams(teamIds: number[]) {
    const teamMemberships = await prisma.membership.findMany({
      where: {
        userId: this.user.id,
        team: {
          id: {
            in: teamIds,
          },
        },
        role: {
          in: ["OWNER", "ADMIN"],
        },
      },
    });
    return teamMemberships.length === teamIds.length;
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

  protected normalizePaymentConfig(input: Partial<PaymentConfig>): PaymentConfig {
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

    return prisma.organizationOnboarding.create({
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
      successUrl: `${WEBAPP_URL}/settings/organizations/new/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${WEBAPP_URL}/settings/organizations/new/cancel?session_id={CHECKOUT_SESSION_ID}`,
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

  protected async validatePermissions(input: CreatePaymentIntentInput) {
    if (!this.hasPermissionToCreateForEmail(input.orgOwnerEmail)) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    if (await this.hasPendingOrganizations(input.orgOwnerEmail)) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You have an existing pending organization. Please complete it before creating a new one.",
      });
    }

    const shouldCreateCustomPrice =
      this.hasPermissionToModifyDefaultPayment() && this.hasModifiedDefaultPayment(input);

    if (!this.hasPermissionToModifyDefaultPayment() && this.hasModifiedDefaultPayment(input)) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You do not have permission to modify the default payment settings",
      });
    }

    if (
      input.teams &&
      !(await this.hasPermissionToMigrateTeams(
        input.teams.filter((team) => team.id > 0 && team.isBeingMigrated).map((team) => team.id) // Migrate out new teams and ones not being migrated
      ))
    ) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You do not have permission to migrate these teams",
      });
    }

    return shouldCreateCustomPrice;
  }

  async createPaymentIntent(input: CreatePaymentIntentInput) {
    const shouldCreateCustomPrice = await this.validatePermissions(input);
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

    await prisma.organizationOnboarding.update({
      where: { id: organizationOnboarding.id },
      data: { stripeCustomerId },
    });

    return {
      organizationOnboarding,
      checkoutUrl: subscription.checkoutUrl,
      sessionId: subscription.sessionId,
    };
  }
}
