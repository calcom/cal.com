import type { Team } from "@calcom/prisma/client";

export type OrgProfile = {
  id: number;
  upId: string;
  username: string;
  organizationId: number;
  organization: Pick<Team, "name" | "id" | "slug" | "calVideoLogo"> & {
    requestedSlug: string | null;
  };
};

export type PersonalProfile = {
  id: number;
  upId: string;
  username: string;
  organizationId: null;
  organization: null;
};

export type UserAsPersonalProfile = {
  id: null;
  upId: string;
  username: string | null;
  organizationId: null;
  organization: null;
};

export type UserProfile = PersonalProfile | OrgProfile | UserAsPersonalProfile;
