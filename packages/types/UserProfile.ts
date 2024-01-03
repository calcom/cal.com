import type { Team } from "@calcom/prisma/client";

export type PersonalProfile = {
  username: string | null;
  organizationId: null;
  organization: null;
};

export type OrgProfile = {
  username: string;
  organizationId: number;
  organization: Pick<Team, "name" | "id" | "slug" | "calVideoLogo"> & {
    requestedSlug: string | null;
  };
};

export type UserProfile = PersonalProfile | OrgProfile | null;
