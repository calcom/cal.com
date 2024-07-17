import type { MembershipRole } from "@calcom/prisma/enums";

export interface NewTeamFormValues {
  name: string;
  slug: string;
  temporarySlug: string;
  logo: string;
}

export interface PendingMember {
  name: string | null;
  email: string;
  id?: number;
  username: string | null;
  role: MembershipRole;
  avatarUrl?: string | null;
  sendInviteEmail?: boolean;
}
