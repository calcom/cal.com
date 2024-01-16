import type { Team } from "@calcom/prisma/client";

export type PersonalProfile = {
  id: null;
  username: string | null;
  organizationId: null;
  organization: null;
  legacyId: string;
};

export type OrgProfile = {
  username: string;
  legacyId: string;
  organizationId: number;
  organization: Pick<Team, "name" | "id" | "slug" | "calVideoLogo"> & {
    requestedSlug: string | null;
  };
};

export type UserProfile = PersonalProfile | OrgProfile | null;
