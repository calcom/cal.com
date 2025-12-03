import type { NextApiResponse } from "next";

import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import stripe from "../../server";

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
  protected contextName = "Team"; // Can be overridden by subclasses

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

  protected getValidatedTeamSubscriptionId(metadata: Prisma.JsonValue) {
    const teamMetadataParsed = teamMetadataSchema.safeParse(metadata);

    if (!teamMetadataParsed.success || !teamMetadataParsed.data?.subscriptionId) {
      return null;
    }

    return teamMetadataParsed.data.subscriptionId;
  }

  protected getValidatedTeamSubscriptionIdForPlatform(subscriptionId?: string | null) {
    if (!subscriptionId) {
      return null;
    }
    return subscriptionId;
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
        message: `${this.contextName} billing not properly configured. Please contact support.`,
      });
      return;
    }

    // Create portal URL and redirect
    const billingPortalUrl = await this.createBillingPortalUrl(customerId, returnUrl);
    res.redirect(302, billingPortalUrl);
  }
}
