import { z } from "zod";

import { TeamBilling } from "../../teams";
import type { SWHMap } from "./__handler";

const metadataSchema = z.object({
  teamId: z.coerce.number(),
});

const handler = async (data: SWHMap["customer.subscription.deleted"]["data"]) => {
  const subscription = data.object;
  console.log("subscription", subscription);
  try {
    const { teamId } = metadataSchema.parse(subscription.metadata);
    const teamBilling = await TeamBilling.findAndCreate(teamId);
    await teamBilling.downgrade();
    return { success: true };
  } catch (error) {
    const team = await TeamBilling.findBySubscriptionId(subscription.id);
    const teamBilling = TeamBilling.create(team);
    await teamBilling.downgrade();
    return { success: true };
  }
  return { success: false };
};

export default handler;
