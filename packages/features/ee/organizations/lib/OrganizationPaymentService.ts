import { StripeBillingService } from "@calcom/features/ee/billing/stripe-billling-service";
import {
  ORGANIZATION_SELF_SERVE_MIN_SEATS,
  ORGANIZATION_SELF_SERVE_PRICE,
  WEBAPP_URL,
} from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { OrganizationOnboardingRepository } from "@calcom/lib/server/repository/organizationOnboarding";
import { UserRepository } from "@calcom/lib/server/repository/user";
import { prisma } from "@calcom/prisma";
import type { OrganizationOnboarding } from "@calcom/prisma/client";
import type { BillingPeriod } from "@calcom/prisma/enums";
import { userMetadata } from "@calcom/prisma/zod-utils";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import { OrganizationPermissionService } from "./OrganizationPermissionService";

type OrganizationOnboardingId = string;
const log = logger.getSubLogger({ prefix: ["OrganizationPaymentService"] });
type CreatePaymentIntentInput = {
  logo: string | null;
  bio: string | null;
  teams?: { id: number; isBeingMigrated: boolean; slug: string | null; name: string }[];
  invitedMembers?: { email: string }[];
};

type CreateOnboardingInput = {
  name: string;
  slug: string;
  orgOwnerEmail: string;
  billingPeriod?: BillingPeriod;
  seats?: number | null;
  pricePerSeat?: number | null;
  createdByUserId: number;
};

type PermissionCheckInput = {
  orgOwnerEmail: string;
  teams: { id: number; isBeingMigrated: boolean }[];
  billingPeriod: BillingPeriod;
  seats: number;
  pricePerSeat: number;
  slug: string;
};

type OrganizationOnboardingForPaymentIntent = Pick<
  OrganizationOnboarding,
  | "id"
  | "pricePerSeat"
  | "billingPeriod"
  | "seats"
  | "isComplete"
  | "orgOwnerEmail"
  | "slug"
  | "stripeCustomerId"
>;

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
    log.debug("getOrCreateStripeCustomerId", safeStringify({ email }));
    const existingCustomer = await prisma.user.findUnique({
      where: { email },
      select: { id: true, metadata: true },
    });

    const parsedMetadata = existingCustomer?.metadata
      ? userMetadata.parse(existingCustomer.metadata)
      : undefined;

    if (parsedMetadata?.stripeCustomerId) {
      return parsedMetadata.stripeCustomerId;
    }

    log.debug("Creating new Stripe customer", safeStringify({ email }));
    const customer = await this.billingService.createCustomer({
      email,
      metadata: {
        email,
      },
    });

    const stripeCustomerId = customer.stripeCustomerId;
    if (existingCustomer && parsedMetadata) {
      await UserRepository.updateStripeCustomerId({
        id: existingCustomer.id,
        stripeCustomerId,
        existingMetadata: parsedMetadata,
      });
    }

    log.debug("Created new Stripe customer", safeStringify({ email, stripeCustomerId }));

    return stripeCustomerId;
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

  protected async getUniqueTeamMembersCount({
    teamIds,
    invitedMembers,
  }: {
    teamIds: number[];
    invitedMembers?: { email: string }[];
  }) {
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

    const emailsSet = new Set(memberships.map((membership) => membership.user.email));

    if (invitedMembers) {
      invitedMembers.forEach((member) => {
        emailsSet.add(member.email);
      });
    }

    return emailsSet.size;
  }

  async createOrganizationOnboarding(input: CreateOnboardingInput) {
    if (
      this.permissionService.hasModifiedDefaultPayment(input) &&
      !this.permissionService.hasPermissionToModifyDefaultPayment()
    ) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You do not have permission to modify the default payment settings",
      });
    }

    await this.permissionService.validatePermissions(input);

    // We know admin permissions have been validated in the above step so we can safely normalize the input
    const config = this.normalizePaymentConfig(input);

    // Create new onboarding record if none exists
    return await OrganizationOnboardingRepository.create({
      name: input.name,
      slug: input.slug,
      orgOwnerEmail: input.orgOwnerEmail,
      billingPeriod: config.billingPeriod,
      seats: config.seats,
      pricePerSeat: config.pricePerSeat,
      createdById: input.createdByUserId,
    });
  }

  protected async getOrCreatePrice(
    config: PaymentConfig,
    organizationOnboardingId: OrganizationOnboardingId,
    shouldCreateCustomPrice: boolean
  ): Promise<StripePrice> {
    log.debug(
      "getOrCreatePrice",
      safeStringify({
        config,
        organizationOnboardingId,
        shouldCreateCustomPrice,
      })
    );

    if (!process.env.STRIPE_ORG_PRODUCT_ID || !process.env.STRIPE_ORG_MONTHLY_PRICE_ID) {
      throw new Error("STRIPE_ORG_PRODUCT_ID or STRIPE_ORG_MONTHLY_PRICE_ID is not set");
    }

    const fixedPriceId = process.env.STRIPE_ORG_MONTHLY_PRICE_ID;
    if (!shouldCreateCustomPrice) {
      return {
        priceId: fixedPriceId,
        isCustom: false,
      };
    }

    const { interval, occurrence } = (() => {
      if (config.billingPeriod === "MONTHLY") return { interval: "month" as const, occurrence: 1 };
      if (config.billingPeriod === "ANNUALLY") return { interval: "year" as const, occurrence: 12 };
      throw new Error(`Invalid billing period: ${config.billingPeriod}`);
    })();

    const customPrice = await this.billingService.createPrice({
      amount: config.pricePerSeat * 100 * occurrence,
      productId: process.env.STRIPE_ORG_PRODUCT_ID,
      currency: "usd",
      interval,
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
    organizationOnboardingId: OrganizationOnboardingId,
    params: URLSearchParams
  ) {
    log.debug(
      "Creating subscription",
      safeStringify({
        stripeCustomerId,
        priceId,
        config,
        organizationOnboardingId,
      })
    );
    return this.billingService.createSubscriptionCheckout({
      customerId: stripeCustomerId,
      successUrl: `${WEBAPP_URL}/settings/organizations/new/status?session_id={CHECKOUT_SESSION_ID}&paymentStatus=success&${params.toString()}`,
      cancelUrl: `${WEBAPP_URL}/settings/organizations/new/status?session_id={CHECKOUT_SESSION_ID}&paymentStatus=failed&${params.toString()}`,
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

  protected async validatePermissions(input: PermissionCheckInput): Promise<boolean> {
    return this.permissionService.validatePermissions(input);
  }

  async createPaymentIntent(
    input: CreatePaymentIntentInput,
    organizationOnboarding: OrganizationOnboardingForPaymentIntent
  ) {
    log.debug("createPaymentIntent", safeStringify(input));

    const { teams: _teams, invitedMembers, logo, bio } = input;

    const teams = _teams?.filter((team) => team.id === -1 || team.isBeingMigrated) || [];
    const teamIds = teams.filter((team) => team.id > 0).map((team) => team.id);

    const { orgOwnerEmail, pricePerSeat, slug, billingPeriod, seats } = organizationOnboarding;

    if (this.user.role === "ADMIN") {
      log.debug("Admin flow, skipping checkout", safeStringify({ organizationOnboarding }));
      return {
        organizationOnboarding,
        subscription: null,
        checkoutUrl: null,
        sessionId: null,
      };
    }

    await this.validatePermissions({
      orgOwnerEmail,
      teams,
      billingPeriod,
      seats,
      pricePerSeat,
      slug,
    });

    const hasModifiedDefaultPayment = this.permissionService.hasModifiedDefaultPayment({
      billingPeriod,
      pricePerSeat,
      seats,
    });

    const paymentConfigFromOnboarding = {
      pricePerSeat,
      billingPeriod,
      seats,
    };

    // Get unique members count from existing teams
    const uniqueMembersCount = await this.getUniqueTeamMembersCount({ teamIds, invitedMembers });

    // Create new config with updated seats if necessary
    const updatedConfig = {
      ...paymentConfigFromOnboarding,
      seats: Math.max(paymentConfigFromOnboarding.seats, uniqueMembersCount),
    };

    log.debug(
      "Creating subscription",
      safeStringify({
        paymentConfigFromOnboarding,
      })
    );

    const { priceId } = await this.getOrCreatePrice(
      updatedConfig,
      organizationOnboarding.id,
      // Whether modified default payment is allowed or not is checked as part of this.createPaymentIntent and onboarding entry is only created after that.
      hasModifiedDefaultPayment
    );

    const stripeCustomerId = organizationOnboarding.stripeCustomerId
      ? organizationOnboarding.stripeCustomerId
      : await this.getOrCreateStripeCustomerId(organizationOnboarding.orgOwnerEmail);

    const subscription = await this.createSubscription(
      stripeCustomerId,
      priceId,
      updatedConfig,
      organizationOnboarding.id,
      new URLSearchParams({
        orgOwnerEmail: organizationOnboarding.orgOwnerEmail,
      })
    );

    log.debug("Updating onboarding");

    await OrganizationOnboardingRepository.update(organizationOnboarding.id, {
      bio: bio ?? null,
      logo: logo ?? null,
      invitedMembers: invitedMembers,
      teams,
      stripeCustomerId,
      ...updatedConfig,
    });

    return {
      organizationOnboarding,
      subscription,
      checkoutUrl: subscription.checkoutUrl,
      sessionId: subscription.sessionId,
    };
  }
}
