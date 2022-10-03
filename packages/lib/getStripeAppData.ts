import { getEventTypeAppData } from "@calcom/app-store/utils";

export default function getStripeAppData(
  eventType: Parameters<typeof getEventTypeAppData>[0],
  forcedGet?: boolean
) {
  const stripeAppData = getEventTypeAppData(eventType, "stripe", forcedGet);
  // This is the current expectation of system to have price and currency set always(using DB Level defaults).
  // Newly added apps code should assume that their app data might not be set.
  return stripeAppData || { enabled: false, price: 0, currency: "usd" };
}
