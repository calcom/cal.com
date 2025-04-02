export const isEmail = (str: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);

export const isSubscriptionActive = (subscriptionStatus: string | null) =>
  subscriptionStatus === "active" || subscriptionStatus === "past_due";
