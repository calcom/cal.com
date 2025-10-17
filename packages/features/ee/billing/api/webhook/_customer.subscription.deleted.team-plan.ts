import { z } from "zod";

import logger from "@calcom/lib/logger";

import type { SWHMap } from "../../lib/types";
import { TeamBilling } from "../../teams";

const metadataSchema = z.object({
  teamId: z.coerce.number(),
});

const handler = async (data: SWHMap["customer.subscription.deleted"]["data"]) => {
  const log = logger.getSubLogger({ prefix: ["stripe", "webhook", "customer.subscription.deleted"] });
  const subscription = data.object;
  try {
    const { teamId } = metadataSchema.parse(subscription.metadata);
    const teamBilling = await TeamBilling.findAndInit(teamId);
    await teamBilling.downgrade();
    return { success: true };
  } catch (error) {
    // If stripe metadata is missing teamId, we attempt to find by sub ID.
    const team = await TeamBilling.repo.findBySubscriptionId(subscription.id);
    if (!team) {
      log.error(`Cannot find team for subscription ${subscription.id}`);
      return { success: false };
    }
    log.error(`Error downgrading team plan for team ${team.id}`, error);
    const teamBilling = TeamBilling.init(team);
    await teamBilling.downgrade();
    return { success: true };
  }
};

export default handler;
