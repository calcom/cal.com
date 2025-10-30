import type { Prisma } from "@calcom/prisma/client";
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
  teamId?: number;
  teamName?: string;
  role?: string;
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
  onboardingId?: string;
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
  handoverUrl?: string | null;
};

export interface OnboardingUser {
  id: number;
  email: string;
  role: "ADMIN" | "USER";
  name?: string;
}

export type OrganizationOnboardingData = {
  id: string;
  organizationId: number | null;
  name: string;
  slug: string;
  orgOwnerEmail: string;
  seats: number | null;
  pricePerSeat: number | null;
  billingPeriod: BillingPeriod;
  invitedMembers: Prisma.JsonValue;
  teams: Prisma.JsonValue;
  isPlatform: boolean;
  logo: string | null;
  bio: string | null;
  brandColor: string | null;
  bannerUrl: string | null;
  stripeCustomerId: string | null;
  isDomainConfigured: boolean;
};

export type OrganizationData = {
  id: number | null;
  name: string;
  slug: string;
  isOrganizationConfigured: boolean;
  isOrganizationAdminReviewed: boolean;
  autoAcceptEmail: string;
  seats: number | null;
  pricePerSeat: number | null;
  isPlatform: boolean;
  logoUrl: string | null;
  bio: string | null;
  brandColor: string | null;
  bannerUrl: string | null;
  billingPeriod?: "MONTHLY" | "ANNUALLY";
};

export type TeamData = {
  id: number;
  name: string;
  isBeingMigrated: boolean;
  slug: string | null;
};

export type InvitedMember = {
  email: string;
  name?: string;
  teamId?: number;
  teamName?: string;
  role?: string;
};
