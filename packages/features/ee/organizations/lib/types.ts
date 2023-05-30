import type { MembershipRole } from "@calcom/prisma/enums";

export interface NewOrganizationFormValues {
  name: string;
  slug: string;
  logo: string;
  adminEmail: string;
}

export interface PendingMember {
  name: string | null;
  email: string;
  id?: number;
  username: string;
  role: MembershipRole;
  avatar: string | null;
  sendInviteEmail?: boolean;
}
