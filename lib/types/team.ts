import { MembershipRole } from ".prisma/client";

export interface Team {
  id: number;
  name: string | null;
  slug: string | null;
  logo: string | null;
  bio: string | null;
  role: MembershipRole;
  hideBranding: boolean;
  accepted: boolean;
  prevState: null;
}
