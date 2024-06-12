import type { SWHMap } from "./__handler";

const handler = async (data: SWHMap["payment_intent.succeeded"]["data"]) => {
  const paymentIntent = data.object;
  // TODO: Implement payment intent succeeded webhook handler
};

export default handler;
