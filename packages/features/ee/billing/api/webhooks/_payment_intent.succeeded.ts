import billing from "../..";
import type { SWHMap } from "./__handler";

const handler = async (data: SWHMap["payment_intent.succeeded"]["data"]) => {
  const paymentIntent = data.object;
  await billing.handleTeamCancellation();
};

export default handler;
