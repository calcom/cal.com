import type { VelocityUnit } from "./lib/constants";

export interface UserMetrics {
  eventTypeTitles: string[];
  eventTypeDescriptions: string[];
  redirectUrls: string[];
  cancellationReasons: string[];
  bookingLocations: string[];
  bookingResponses: string[];
  workflowContent: string[];
  username: string;
  signupEmailDomain: string;
  signupName: string;
  bookingVelocity: Record<VelocityUnit, number>;
  selfBookingCount: number;
}

export interface RuleEvalResult {
  score: number;
  matchedRules: Array<{ groupId: string; weight: number; description: string }>;
  shouldAutoLock: boolean;
  autoLockRule?: { groupId: string; description: string };
}
