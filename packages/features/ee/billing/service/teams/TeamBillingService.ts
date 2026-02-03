import { getRequestedSlugError } from "@calcom/app-store/stripepayment/lib/team-billing";
import { purchaseTeamOrOrgSubscription } from "@calcom/features/ee/teams/lib/payments";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { getMetadataHelpers } from "@calcom/lib/getMetadataHelpers";
import logger from "@calcom/lib/logger";
import { Redirect } from "@calcom/lib/redirect";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { teamMetadataStrictSchema } from "@calcom/prisma/zod-utils";
import type { z } from "zod";
import { updateSubscriptionQuantity } from "../../lib/subscription-updates";
// import billing from "../..";
import type {
  IBillingRepository,
  IBillingRepositoryCreateArgs,
} from "../../repository/billing/IBillingRepository";
import type { ITeamBillingDataRepository } from "../../repository/teamBillingData/ITeamBillingDataRepository";
import { BillingPeriodService } from "../billingPeriod/BillingPeriodService";
import type { IBillingProviderService } from "../billingProvider/IBillingProviderService";
import {
  type ITeamBillingService,
  type TeamBillingInput,
  TeamBillingPublishResponseStatus,
} from "./ITeamBillingService";

const log = logger.getSubLogger({ prefix: ["TeamBilling"] });

const teamPaymentMetadataSchema = teamMetadataStrictSchema.unwrap();

export class TeamBillingService implements ITeamBillingService {
  private _team!: Omit<TeamBillingInput, "metadata"> & {
    metadata: NonNullable<z.infer<typeof teamPaymentMetadataSchema>>;
  };
  private billingProviderService: IBillingProviderService;
  private billingRepository: IBillingRepository;
  private teamBillingDataRepository: ITeamBillingDataRepository;

  constructor({
    team,
    billingProviderService,
    teamBillingDataRepository,
    billingRepository,
  }: {
    team: TeamBillingInput;
    billingProviderService: IBillingProviderService;
    teamBillingDataRepository: ITeamBillingDataRepository;
    billingRepository: IBillingRepository;
  }) {
    this.team = team;
    this.billingProviderService = billingProviderService;
    this.teamBillingDataRepository = teamBillingDataRepository;
    this.billingRepository = billingRepository;
  }
  set team(team: TeamBillingInput) {
    const metadata = teamPaymentMetadataSchema.parse(team.metadata || {});
    this._team = { ...team, metadata };
  }
  get team(): typeof this._team {
    return this._team;
  }
  private async getOrgIfNeeded() {
    if (!this.team.parentId) return;
    const parentTeam = await this.teamBillingDataRepository.find(this.team.parentId);
    this.team = parentTeam;
  }
  private logErrorFromUnknown(error: unknown) {
    let message = "Unknown error on InternalTeamBilling.";
    if (error instanceof Error) message = error.message;
    log.error(message);
  }
  async cancel() {
    try {
      const { subscriptionId } = this.team.metadata;
      log.info(`Cancelling subscription ${subscriptionId} for team ${this.team.id}`);
      if (!subscriptionId) throw Error("missing subscriptionId");
      await this.billingProviderService.handleSubscriptionCancel(subscriptionId);
      await this.downgrade();
      log.info(`Cancelled subscription ${subscriptionId} for team ${this.team.id}`);
    } catch (error) {
      this.logErrorFromUnknown(error);
    }
  }
  // New teams are published on creation, this is for backwards compatibility
  async publish() {
    const { url } = await this.checkIfTeamPaymentRequired();
    const teamId = this.team.id;
    if (url) {
      // TODO: We should probably hit the logic of this URL handled by the /upgrade API handler as it just generates the url to check the payment status and upgrade if needed
      return { redirectUrl: url, status: TeamBillingPublishResponseStatus.REQUIRES_UPGRADE };
    }
    const requestedSlug = this.team.metadata?.requestedSlug || "";
    // if payment needed, respond with checkout url
    const membershipCount = await prisma.membership.count({ where: { teamId } });
    const owner = await prisma.membership.findFirstOrThrow({
      where: { teamId, role: "OWNER" },
      select: {
        userId: true,
      },
    });

    try {
      // TODO: extract this to new billing service
      const checkoutSession = await purchaseTeamOrOrgSubscription({
        teamId,
        seatsUsed: membershipCount,
        userId: owner.userId,
        pricePerSeat: null,
      });

      if (checkoutSession.url) {
        return {
          redirectUrl: checkoutSession.url,
          status: TeamBillingPublishResponseStatus.REQUIRES_PAYMENT,
        };
      }

      const { mergeMetadata } = getMetadataHelpers(teamPaymentMetadataSchema, this.team.metadata);
      const data: Prisma.TeamUpdateInput = {
        metadata: mergeMetadata({ requestedSlug: undefined }),
      };
      if (requestedSlug) data.slug = requestedSlug;
      await prisma.team.update({ where: { id: teamId }, data });
      return { status: TeamBillingPublishResponseStatus.SUCCESS, redirectUrl: null };
    } catch (error) {
      if (error instanceof Redirect) throw error;
      const { message } = getRequestedSlugError(error, requestedSlug);
      throw Error(message);
    }
  }
  async downgrade() {
    try {
      const { mergeMetadata } = getMetadataHelpers(teamPaymentMetadataSchema, this.team.metadata);
      const metadata = mergeMetadata({
        paymentId: undefined,
        subscriptionId: undefined,
        subscriptionItemId: undefined,
      });
      await prisma.team.update({ where: { id: this.team.id }, data: { metadata } });
      log.info(`Downgraded team ${this.team.id}`);
    } catch (error) {
      this.logErrorFromUnknown(error);
    }
  }
  async updateQuantity() {
    try {
      await this.getOrgIfNeeded();
      const { id: teamId, metadata, isOrganization } = this.team;

      const { url } = await this.checkIfTeamPaymentRequired();
      log.debug("updateQuantity", safeStringify({ url, team: this.team }));

      /**
       * If there's no pending checkout URL it means that this team has not been paid.
       * We cannot update the subscription yet, this will be handled on publish/checkout.
       *
       * An organization can only be created if it is paid for and updateQuantity is called only when we have an organization.
       * For some old organizations, it is possible that they aren't paid for yet, but then they wouldn't have been published as well(i.e. slug would be null and are unusable)
       * So, we can safely assume go forward for organizations.
       **/
      if (!url && !isOrganization) return;

      // TODO: To be read from organizationOnboarding for Organizations later, but considering the fact that certain old organization won't have onboarding
      const { subscriptionId, subscriptionItemId } = metadata;
      const membershipCount = await prisma.membership.count({ where: { teamId } });
      if (!subscriptionId) throw Error("missing subscriptionId");
      if (!subscriptionItemId) throw Error("missing subscriptionItemId");

      const billingPeriodService = new BillingPeriodService();
      const shouldApplyMonthlyProration = await billingPeriodService.shouldApplyMonthlyProration(teamId);
      if (shouldApplyMonthlyProration) {
        log.info(`Skipping subscription update for team ${teamId} because monthly proration is enabled.`);
        return;
      }

      await updateSubscriptionQuantity({
        billingService: this.billingProviderService,
        subscriptionId,
        subscriptionItemId,
        quantity: membershipCount,
      });
      log.info(`Updated subscription ${subscriptionId} for team ${teamId} to ${membershipCount} seats.`);
    } catch (error) {
      this.logErrorFromUnknown(error);
    }
  }
  /** Used to prevent double charges for the same team */
  async checkIfTeamPaymentRequired() {
    const { paymentId } = this.team.metadata || {};
    /** If there's no paymentId, we need to pay this team */
    if (!paymentId) return { url: null, paymentId: null, paymentRequired: true };
    /** If there's a pending session but it isn't paid, we need to pay this team */
    const checkoutSessionIsPaid = await this.billingProviderService.checkoutSessionIsPaid(paymentId);
    if (!checkoutSessionIsPaid) return { url: null, paymentId, paymentRequired: true };
    /** If the session is already paid we return the upgrade URL so team is updated. */
    return {
      url: `${WEBAPP_URL}/api/teams/${this.team.id}/upgrade?session_id=${paymentId}`,
      paymentId,
      paymentRequired: false,
    };
  }
  /** Returns the subscription status (active, past_due, trialing, ...) */
  async getSubscriptionStatus() {
    const { subscriptionId } = this.team.metadata;
    if (!subscriptionId) return null;
    return this.billingProviderService.getSubscriptionStatus(subscriptionId);
  }

  /**
   * Ends the trial period for a team subscription by converting it to a regular subscription
   * @returns {Promise<boolean>} True if successful, false otherwise
   */
  async endTrial() {
    try {
      const { subscriptionId } = this.team.metadata;
      log.info(`Ending trial for subscription ${subscriptionId} of team ${this.team.id}`);

      if (!subscriptionId) {
        log.warn(`No subscription ID found for team ${this.team.id}`);
        return false;
      }

      // End the trial by converting to regular subscription
      await this.billingProviderService.handleEndTrial(subscriptionId);
      log.info(`Successfully ended trial for team ${this.team.id}`);
      return true;
    } catch (error) {
      this.logErrorFromUnknown(error);
      return false;
    }
  }
  async saveTeamBilling(args: IBillingRepositoryCreateArgs) {
    await this.billingRepository.create(args);
  }
}
