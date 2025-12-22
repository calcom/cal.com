import type { MembershipRole } from "@calcom/prisma/enums";
import type { UserProfile } from "@calcom/types/UserProfile";

export type ChildrenEventType = {
  value: string;
  label: string;
  created: boolean;
  owner: {
    avatar: string;
    id: number;
    email: string;
    name: string;
    username: string;
    membership: MembershipRole;
    eventTypeSlugs: string[];
    profile: UserProfile;
  };
  slug: string;
  hidden: boolean;
};
