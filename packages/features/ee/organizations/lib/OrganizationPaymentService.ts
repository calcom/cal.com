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
  private billingService: StripeBillingService;
  private user: NonNullable<TrpcSessionUser>;

  constructor(user: NonNullable<TrpcSessionUser>) {
    this.billingService = new StripeBillingService();
    this.user = user;
  }

  private hasPermissionToCreateForEmail(targetEmail: string) {
    if (this.user.role === "ADMIN") {
      return true;
    }
    return this.user.email === targetEmail;
  }

  private async hasPendingOrganizations(email: string) {
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

  private hasPermissionToModifyDefaultPayment() {
    return this.user.role === "ADMIN";
  }

  private hasModifiedDefaultPayment(input: Partial<PaymentConfig>) {
    return (
      (input.billingPeriod !== undefined && input.billingPeriod !== "MONTHLY") ||
      (input.seats !== undefined && input.seats !== ORGANIZATION_SELF_SERVE_MIN_SEATS) ||
      (input.pricePerSeat !== undefined && input.pricePerSeat !== ORGANIZATION_SELF_SERVE_PRICE)
    );
  }

  private async hasPermissionToMigrateTeams(teamIds: number[]) {
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

  private async getOrCreateStripeCustomerId(email: string) {
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

  private normalizePaymentConfig(input: Partial<PaymentConfig>): PaymentConfig {
    return {
      billingPeriod: input.billingPeriod || "MONTHLY",
      seats: input.seats || Number(ORGANIZATION_SELF_SERVE_MIN_SEATS),
      pricePerSeat: input.pricePerSeat || Number(ORGANIZATION_SELF_SERVE_PRICE),
    };
  }

  private async createOrganizationOnboarding(
    input: CreatePaymentIntentInput,
    config: PaymentConfig,
    stripeCustomerId: string
  ) {
    return prisma.organizationOnboarding.create({
      data: {
        name: input.name,
        slug: input.slug,
        orgOwnerEmail: input.orgOwnerEmail,
        billingPeriod: config.billingPeriod,
        seats: config.seats,
        pricePerSeat: config.pricePerSeat,
        stripeCustomerId,
        invitedMembers: input.invitedMembers,
        teams: input.teams?.filter((team) => team.id === -1 || team.isBeingMigrated),
      },
    });
  }

  private async getOrCreatePrice(
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

  private async createSubscription(
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

  private async validatePermissions(input: CreatePaymentIntentInput) {
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
