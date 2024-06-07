import billing from "../..";
import type { SWHMap } from "./__handler";

const handler = async (data: SWHMap["customer.subscription.deleted"]["data"]) => {
  const subscription = data.object;
  await billing.handleTeamCancellation();
};

export default handler;
