import type { Card } from "@pages/api/plain";
import customerCardDisplay from "@pages/api/plain/customer-card-display";

export const cardExamples: ((
  email: string,
  id: string,
  username: string,
  timeZone: string,
  emailVerified: Date | null,
  twoFactorEnabled: boolean | null
) => Card)[] = [customerCardDisplay];
