import type { SWHMap } from "../../lib/types";

// This is a placeholder to showcase adding new event handlers
const handler = async (data: SWHMap["payment_intent.succeeded"]["data"]) => {
  const paymentIntent = data.object;
  console.log(paymentIntent);
  // TODO: Implement payment intent succeeded webhook handler
  return { success: true };
};

export default handler;
