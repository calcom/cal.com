import { getEventTypeAppData } from "@calcom/app-store/utils";

export default function getStripeAppData(eventType: Parameters<typeof getEventTypeAppData>[0]) {
  const stripeAppData = getEventTypeAppData(eventType, "stripe");
  return stripeAppData || { price: 0, currency: "usd" };
}
