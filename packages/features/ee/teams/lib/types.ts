import { MembershipRole } from "@prisma/client";

export interface NewTeamMembersFieldArray {
  members: PendingMember[];
}

export interface NewTeamFormValues {
  name: string;
  slug: string;
  logo: string;
}

export interface PendingMember {
  name: string | null;
  email: string;
  id?: number;
  username: string | null;
  role: MembershipRole;
  avatar: string | null;
  sendInviteEmail?: boolean;
  customerId?: string;
  subscriptionId: string;
}

export type NewTeamData = NewTeamFormValues &
  NewTeamMembersFieldArray & { billingFrequency: "monthly" | "yearly" };

export interface TeamPrices {
  monthly: number;
  yearly: number;
}
