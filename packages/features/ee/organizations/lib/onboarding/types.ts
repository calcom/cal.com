import type { BillingPeriod, CreationSource } from "@calcom/prisma/enums";

export type TeamInput = {
  id: number;
  name: string;
  isBeingMigrated: boolean;
  slug: string | null;
};

export type InvitedMemberInput = {
  email: string;
  name?: string;
};

export type CreateOnboardingIntentInput = {
  name: string;
  slug: string;
  orgOwnerEmail: string;
  seats?: number | null;
  pricePerSeat?: number | null;
  billingPeriod?: BillingPeriod;
  isPlatform: boolean;
  creationSource: CreationSource;
  logo?: string | null;
  bio?: string | null;
  brandColor?: string | null;
  bannerUrl?: string | null;
  teams?: TeamInput[];
  invitedMembers?: InvitedMemberInput[];
};

export type OnboardingIntentResult = {
  userId: number;
  orgOwnerEmail: string;
  name: string;
  slug: string;
  seats: number | null;
  pricePerSeat: number | null;
  billingPeriod?: BillingPeriod;
  isPlatform: boolean;
  organizationOnboardingId: string;
  checkoutUrl: string | null;
  organizationId?: number | null;
};

export interface OnboardingUser {
  id: number;
  email: string;
  role: "ADMIN" | "USER";
  name?: string;
}
