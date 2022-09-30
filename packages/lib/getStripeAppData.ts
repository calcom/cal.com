import { getEventTypeAppData } from "@calcom/app-store/utils";

export default function getStripeAppData(eventType: Parameters<typeof getEventTypeAppData>[0]) {
  const stripeAppData = getEventTypeAppData(eventType, "stripe");
  // This is the current expectation of system to have price and currency set always(using DB Level defaults).
  // Further apps code should assume that their app data might not be set.
  return stripeAppData || { price: 0, currency: "usd" };
}
