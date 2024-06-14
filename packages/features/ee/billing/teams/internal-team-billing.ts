import { z } from "zod";

import { MINIMUM_NUMBER_OF_ORG_SEATS, WEBAPP_URL } from "@calcom/lib/constants";
import { getMetadataHelpers } from "@calcom/lib/getMetadataHelpers";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import billing from "..";
import type { TeamBilling, TeamBillingInput } from "./team-billing";

const log = logger.getSubLogger({ prefix: ["TeamBilling"] });

const teamPaymentMetadataSchema = z.object({
  // Redefine paymentId, subscriptionId and subscriptionItemId to ensure that they are present and nonNullable
  paymentId: z.string(),
  subscriptionId: z.string(),
  subscriptionItemId: z.string(),
  orgSeats: teamMetadataSchema.unwrap().shape.orgSeats,
});

export class InternalTeamBilling implements TeamBilling {
  private _team!: Omit<TeamBillingInput, "metadata"> & {
    metadata: z.infer<typeof teamPaymentMetadataSchema>;
  };
  constructor(team: TeamBillingInput) {
    this.team = team;
  }
  set team(team: TeamBillingInput) {
    const metadata = teamPaymentMetadataSchema.parse(team.metadata);
    this._team = { ...team, metadata };
  }
  get team(): typeof this._team {
    return this._team;
  }
  private async getOrgIfNeeded() {
    if (!this.team.parentId) return;
    const parentTeam = await prisma.team.findUniqueOrThrow({
      where: { id: this.team.parentId },
      select: { metadata: true, id: true, parentId: true, isOrganization: true },
    });
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
      await billing.handleSubscriptionCancel(subscriptionId);
      await this.downgrade();
      log.info(`Cancelled subscription ${subscriptionId} for team ${this.team.id}`);
    } catch (error) {
      this.logErrorFromUnknown(error);
    }
  }
  async downgrade() {
    try {
      const { mergeMetadata } = getMetadataHelpers(teamPaymentMetadataSchema.partial(), this.team.metadata);
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
      const { url } = await this.checkIfTeamPaymentRequired();
      /**
       * If there's no pending checkout URL it means that this team has not been paid.
       * We cannot update the subscription yet, this will be handled on publish/checkout.
       **/
      if (!url) return;
      const { id: teamId, metadata, isOrganization } = this.team;
      const { subscriptionId, subscriptionItemId, orgSeats } = metadata;
      // Either it would be custom pricing where minimum number of seats are changed(available in orgSeats) or it would be default MINIMUM_NUMBER_OF_ORG_SEATS
      // We can't go below this quantity for subscription
      const orgMinimumSubscriptionQuantity = orgSeats || MINIMUM_NUMBER_OF_ORG_SEATS;
      const membershipCount = await prisma.membership.count({ where: { teamId } });
      if (isOrganization && membershipCount < orgMinimumSubscriptionQuantity) {
        log.info(
          `Org ${teamId} has less members than the min required ${orgMinimumSubscriptionQuantity}, skipping updating subscription.`
        );
        return;
      }
      await billing.handleSubscriptionUpdate({ subscriptionId, subscriptionItemId, membershipCount });
      log.info(`Updated subscription ${subscriptionId} for team ${teamId} to ${membershipCount} seats.`);
    } catch (error) {
      this.logErrorFromUnknown(error);
    }
  }
  /** Used to prevent double charges for the same team */
  private checkIfTeamPaymentRequired = async () => {
    const { paymentId } = this.team.metadata;
    /** If there's no paymentId, we need to pay this team */
    if (!paymentId) return { url: null };
    /** If there's a pending session but it isn't paid, we need to pay this team */
    const checkoutSessionIsPaid = await billing.checkoutSessionIsPaid(paymentId);
    if (!checkoutSessionIsPaid) return { url: null };
    /** If the session is already paid we return the upgrade URL so team is updated. */
    return { url: `${WEBAPP_URL}/api/teams/${this.team.id}/upgrade?session_id=${paymentId}` };
  };
}
