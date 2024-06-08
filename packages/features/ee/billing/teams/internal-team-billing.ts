import type { Team } from "@prisma/client";
import { z } from "zod";

import logger from "@calcom/lib/logger";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import billing from "..";
import type { TeamBilling } from "./team-billing";

const log = logger.getSubLogger({ prefix: ["TeamBilling"] });

const teamPaymentMetadataSchema = z.object({
  // Redefine paymentId, subscriptionId and subscriptionItemId to ensure that they are present and nonNullable
  paymentId: z.string(),
  subscriptionId: z.string(),
  subscriptionItemId: z.string(),
  orgSeats: teamMetadataSchema.unwrap().shape.orgSeats,
});

export class InternalTeamBilling implements TeamBilling {
  private team: Pick<Team, "id"> & { metadata: z.infer<typeof teamPaymentMetadataSchema> };
  constructor(team: Pick<Team, "id" | "metadata">) {
    const metadata = teamPaymentMetadataSchema.parse(team.metadata);
    this.team = { ...team, metadata };
  }
  async cancel() {
    try {
      const { subscriptionId } = this.team.metadata;
      log.info(`Cancelling subscription ${subscriptionId} for team ${this.team.id}`);
      await billing.handleSubscriptionCancel(subscriptionId);
      log.info(`Cancelled subscription ${subscriptionId} for team ${this.team.id}`);
    } catch (error) {
      let message = "Unknown error on cancelTeamSubscriptionFromStripe";
      if (error instanceof Error) message = error.message;
      console.error(message);
    }
  }
}
