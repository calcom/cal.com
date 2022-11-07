import { MembershipRole } from "@prisma/client";

export interface NewTeamMembersFieldArray {
  members: PendingMember[] | [];
}

export interface NewTeamFormValues {
  name: string;
  temporarySlug: string;
  logo: string;
}

export interface PendingMember {
  name: string | null;
  email: string;
  id?: number;
  username: string | null;
  role: MembershipRole;
  avatar: string | null;
  locale: string;
}

export type NewTeamData = NewTeamFormValues &
  NewTeamMembersFieldArray & {
    billingFrequency: "monthly" | "yearly";
    customerId?: string;
    subscriptionId?: string;
  };

export interface TeamPrices {
  monthly: number;
  yearly: number;
}
