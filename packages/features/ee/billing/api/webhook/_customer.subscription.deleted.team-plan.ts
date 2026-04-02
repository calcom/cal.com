import logger from "@calcom/lib/logger";
import { z } from "zod";
import { getTeamBillingDataRepository, getTeamBillingServiceFactory } from "../../di/containers/Billing";
import type { SWHMap } from "./__handler";

const metadataSchema = z.object({
  teamId: z.coerce.number(),
});

const handler = async (data: SWHMap["customer.subscription.deleted"]["data"]) => {
  const subscription = data.object;
  const teamBillingFactory = getTeamBillingServiceFactory();
  const log = logger.getSubLogger({
    prefix: [`[customer.subscription.deleted.team-plan]: subscriptionId: ${subscription.id}`],
  });

  try {
    const { teamId } = metadataSchema.parse(subscription.metadata);
    const teamBillingService = await teamBillingFactory.findAndInit(teamId);
    await teamBillingService.downgrade();
    return { success: true };
  } catch {
    const teamBillingDataRepository = getTeamBillingDataRepository();
    // If stripe metadata is missing teamId, we attempt to find by sub ID.
    const team = await teamBillingDataRepository.findBySubscriptionId(subscription.id);
    if (!team) {
      log.warn("No team found with subscriptionId");
      return { success: false };
    }
    const teamBilling = teamBillingFactory.init(team);
    await teamBilling.downgrade();
    return { success: true };
  }
};

export default handler;
