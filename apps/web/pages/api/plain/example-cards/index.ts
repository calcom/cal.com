import type { Card } from "@pages/api/plain";
import customerCardDisplay from "@pages/api/plain/customer-card-display";

export const cardExamples: ((
  name: string,
  email: string,
  id: string,
  username: string,
  timeZone: string,
  emailVerified: Date | null,
  twoFactorEnabled: boolean | null,
  identityProvider: string | null,
  lastActiveAt: Date | null,
  teamName: string | null,
  teamSlug: string | null,
  isOrganization: boolean | null,
  stripeCustomerId: string | null
) => Card)[] = [customerCardDisplay];
