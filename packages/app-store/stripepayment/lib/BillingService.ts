import type { NextApiResponse } from "next";

import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import logger from "@calcom/lib/logger";
import { TeamRepository } from "@calcom/lib/server/repository/team";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import { getStripeCustomerIdFromUserId } from "./customer";
import stripe from "./server";
import { getSubscriptionFromId } from "./subscriptions";

export interface TeamEntity {
  id: number;
  metadata: unknown;
  isOrganization: boolean;
}

export interface BillingPortalResult {
  success: boolean;
  customerId?: string;
  portalUrl?: string;
}

export abstract class BillingPortalService {
  protected permissionService: PermissionCheckService;
  protected teamRepository: TeamRepository;

  constructor() {
    this.permissionService = new PermissionCheckService();
    this.teamRepository = new TeamRepository(prisma);
  }

  /**
   * Creates a billing portal URL for a Stripe customer
   */
  protected async createBillingPortalUrl(customerId: string, returnUrl: string): Promise<string> {
    const log = logger.getSubLogger({ prefix: ["createBillingPortalUrl"] });

    try {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      return portalSession.url;
    } catch (e) {
      log.error(`Failed to create billing portal session for ${customerId}: ${e}`);
      throw new Error("Failed to create billing portal session");
    }
  }

  /**
   * Builds a safe return URL for the billing portal
   */
  protected buildReturnUrl(returnTo?: string): string {
    const defaultUrl = `${WEBAPP_URL}/settings/billing`;

    if (typeof returnTo !== "string") return defaultUrl;

    const safeRedirectUrl = getSafeRedirectUrl(returnTo);
    return safeRedirectUrl || defaultUrl;
  }

  /**
   * Abstract method to check permissions - implemented by subclasses
   */
  abstract checkPermissions(userId: number, teamId: number): Promise<boolean>;

  /**
   * Abstract method to get customer ID - implemented by subclasses
   */
  abstract getCustomerId(teamId: number): Promise<string | null>;

  /**
   * Process billing portal request for a team
   */
  async processBillingPortal(
    userId: number,
    teamId: number,
    returnUrl: string,
    res: NextApiResponse
  ): Promise<void> {
    // Check permissions
    const hasPermission = await this.checkPermissions(userId, teamId);
    if (!hasPermission) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    // Get customer ID
    const customerId = await this.getCustomerId(teamId);
    if (!customerId) {
      res.status(400).json({
        message: "Team billing not properly configured. Please contact support.",
      });
      return;
    }

    // Create portal URL and redirect
    const billingPortalUrl = await this.createBillingPortalUrl(customerId, returnUrl);
    res.redirect(302, billingPortalUrl);
  }
}

/**
 * Billing portal service for regular teams
 */
export class TeamBillingPortalService extends BillingPortalService {
  async checkPermissions(userId: number, teamId: number): Promise<boolean> {
    return await this.permissionService.checkPermission({
      userId,
      teamId,
      permission: "team.manageBilling",
      fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
    });
  }

  async getCustomerId(teamId: number): Promise<string | null> {
    const team = await this.teamRepository.findById({ id: teamId });
    if (!team) return null;

    const teamMetadataParsed = teamMetadataSchema.safeParse(team.metadata);

    if (!teamMetadataParsed.success || !teamMetadataParsed.data?.subscriptionId) {
      return null;
    }

    const subscription = await getSubscriptionFromId(teamMetadataParsed.data.subscriptionId);

    if (!subscription?.customer) {
      return null;
    }

    return subscription.customer as string;
  }
}

/**
 * Billing portal service for organizations
 */
export class OrganizationBillingPortalService extends BillingPortalService {
  async checkPermissions(userId: number, teamId: number): Promise<boolean> {
    return await this.permissionService.checkPermission({
      userId,
      teamId,
      permission: "organization.manageBilling",
      fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
    });
  }

  async getCustomerId(teamId: number): Promise<string | null> {
    const team = await this.teamRepository.findById({ id: teamId });
    if (!team) return null;

    const teamMetadataParsed = teamMetadataSchema.safeParse(team.metadata);

    if (!teamMetadataParsed.success || !teamMetadataParsed.data?.subscriptionId) {
      return null;
    }

    const subscription = await getSubscriptionFromId(teamMetadataParsed.data.subscriptionId);

    if (!subscription?.customer) {
      return null;
    }

    return subscription.customer as string;
  }
}

/**
 * Billing portal service for individual users
 */
export class UserBillingPortalService {
  /**
   * Get customer ID for a user
   */
  async getCustomerId(userId: number): Promise<string | null> {
    return await getStripeCustomerIdFromUserId(userId);
  }

  /**
   * Process billing portal request for a user
   */
  async processBillingPortal(userId: number, returnUrl: string, res: NextApiResponse): Promise<void> {
    const customerId = await this.getCustomerId(userId);
    if (!customerId) {
      res.status(404).json({ message: "CustomerId not found" });
      return;
    }

    const billingPortalUrl = await this.createBillingPortalUrl(customerId, returnUrl);
    res.redirect(302, billingPortalUrl);
  }

  /**
   * Creates a billing portal URL for a Stripe customer
   */
  private async createBillingPortalUrl(customerId: string, returnUrl: string): Promise<string> {
    const log = logger.getSubLogger({ prefix: ["createBillingPortalUrl"] });

    try {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      return portalSession.url;
    } catch (e) {
      log.error(`Failed to create billing portal session for ${customerId}: ${e}`);
      throw new Error("Failed to create billing portal session");
    }
  }
}

/**
 * Factory to create the appropriate billing portal service based on team type
 */
export class BillingPortalServiceFactory {
  /**
   * Determines team type and returns the appropriate service
   */
  static async createService(teamId: number): Promise<BillingPortalService> {
    const teamRepository = new TeamRepository(prisma);
    const team = await teamRepository.findById({ id: teamId });

    if (!team) {
      throw new Error("Team not found");
    }

    if (team.isOrganization) {
      return new OrganizationBillingPortalService();
    }

    return new TeamBillingPortalService();
  }

  /**
   * Creates a user billing portal service
   */
  static createUserService(): UserBillingPortalService {
    return new UserBillingPortalService();
  }
}
