export interface UserProfile {
  id: number;
  username: string;
  name: string;
  email: string;
  bio?: string;
  avatarUrl?: string;
  timeZone?: string;
  weekStart?: string;
  timeFormat?: number;
  defaultScheduleId?: number;
  locale?: string;
  organizationId?: number;
  organization?: {
    id: number;
    isPlatform: boolean;
  };
  metadata?: Record<string, any>;
  brandColor?: string;
  darkBrandColor?: string;
  theme?: string;
}

export interface ConferencingOption {
  id: number;
  type: string;
  userId: number | null;
  teamId: number | null;
  appId: string | null;
  subscriptionId: number | null;
  paymentStatus: string | null;
  billingCycleStart: string | null;
  invalid: boolean;
  delegationCredentialId: string | null;
}
