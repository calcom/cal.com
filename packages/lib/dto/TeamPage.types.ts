import type { Prisma } from "@calcom/prisma/client";

/**
 * Minimal user data needed for displaying avatars in UserAvatarGroup
 */
export type TeamPageUserDto = {
  id: number;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
  avatar: string;
  profile: {
    username: string | null;
    organization: {
      slug: string | null;
    } | null;
  } | null;
};

/**
 * Minimal event type data needed for the team page
 * Used by EventTypeDescription and event type listing
 */
export type TeamPageEventTypeDto = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  length: number;
  schedulingType: "ROUND_ROBIN" | "COLLECTIVE" | "MANAGED" | null;
  recurringEvent: Prisma.JsonValue;
  metadata: Prisma.JsonValue;
  requiresConfirmation: boolean;
  seatsPerTimeSlot: number | null;
  descriptionAsSafeHTML: string | null;
  users: TeamPageUserDto[];
};

/**
 * Minimal member data needed for the team page
 * Used by Team component and SubTeams member filtering
 */
export type TeamPageMemberDto = {
  id: number;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
  organizationId: number | null;
  accepted: boolean;
  subteams: string[] | null;
  profile: {
    id: number | null;
    upId: string;
    username: string | null;
    organizationId: number | null;
    organization: {
      id: number;
      name: string;
      slug: string | null;
      calVideoLogo: string | null;
      bannerUrl: string | null;
      requestedSlug: string | null;
    } | null;
  };
  safeBio: string;
  bookerUrl: string;
};

/**
 * Minimal child team data needed for SubTeams display
 */
export type TeamPageChildDto = {
  slug: string;
  name: string | null;
};

/**
 * Minimal parent team data needed for team page display
 */
export type TeamPageParentDto = {
  id: number;
  slug: string | null;
  name: string;
  isOrganization: boolean;
  isPrivate: boolean;
  logoUrl: string | null;
  requestedSlug?: string | null;
};

/**
 * Complete team data structure for the team page
 * This is the minimal data needed to render the team page
 */
export type TeamPageDto = {
  id: number;
  slug: string | null;
  name: string | null;
  bio: string | null;
  safeBio: string;
  theme: string | null;
  isPrivate: boolean;
  isOrganization: boolean;
  hideBookATeamMember: boolean;
  logoUrl: string | null;
  brandColor: string | null;
  darkBrandColor: string | null;
  metadata: Record<string, unknown>;
  parent: TeamPageParentDto | null;
  eventTypes: TeamPageEventTypeDto[] | null;
  members: TeamPageMemberDto[];
  children: TeamPageChildDto[];
};

/**
 * Props returned by getServerSideProps for the team page
 */
export type TeamPageProps = {
  team: TeamPageDto;
  themeBasis: string | null;
  markdownStrippedBio: string;
  isValidOrgDomain: boolean;
  currentOrgDomain: string | null;
  isSEOIndexable: boolean;
};

/**
 * Props for unpublished team state
 */
export type UnpublishedTeamPageProps = {
  considerUnpublished: true;
  team: {
    id: number;
    slug: string | null;
    name: string | null;
    isOrganization: boolean;
    logoUrl: string | null;
    metadata: Record<string, unknown>;
    parent: TeamPageParentDto | null;
    createdAt: null;
  };
};

/**
 * Union type for all possible team page props
 */
export type TeamPageServerSideProps =
  | ({ considerUnpublished?: false } & TeamPageProps)
  | UnpublishedTeamPageProps;
