export default function getGlobalSubscribers(eventTrigger: string): string[] {
  const subscribersAsString = process.env.GLOBAL_WEBHOOK_SUBSCRIBERS || "{}";
  const subscribers = JSON.parse(subscribersAsString) as Record<string, string[]>;
  return subscribers[eventTrigger] || [];
}
