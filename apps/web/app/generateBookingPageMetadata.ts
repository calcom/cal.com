import type { TFunction } from "next-i18next";

import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";

import { generateMeetingMetadata } from "./_utils";

type MetadataPayload = {
  title: (t: TFunction) => string;
  description: (t: TFunction) => string;
  meeting: {
    title: string;
    profile: { name: string; image: string };
    users?: { name: string; username: string }[];
  };
  robots: {
    index: boolean;
    follow: boolean;
  };
};

type UserProfilePageProfile = {
  name: string | null;
  username: string | null;
  image: string | null;
  markdownStrippedBio: string | null | undefined;
};

type TeamProfilePageProfile = {
  teamName: string | null;
  image: string | null;
  markdownStrippedBio: string | null | undefined;
};

type EventBookingPageProfile = { name: string; image: string };
type BaseMetadataArgs = {
  hideBranding: boolean;
  orgSlug: string | null;
  isSEOIndexable: boolean;
  isReschedule?: boolean;
};

type TeamProfilePageArgs = BaseMetadataArgs & {
  profile: TeamProfilePageProfile;
  event: null;
};

type UserProfilePageArgs = BaseMetadataArgs & {
  profile: UserProfilePageProfile;
  event: null;
};

type EventBookingPageArgs = BaseMetadataArgs & {
  profile: EventBookingPageProfile;
  event: {
    title: string;
    hidden: boolean;
    users: { name: string | null; username: string | null }[];
  };
};

export const generateEventBookingPageMetadata = async (props: EventBookingPageArgs) => {
  const { profile, isReschedule, hideBranding, orgSlug, isSEOIndexable, event } = props;
  const fullOrigin = getOrgFullOrigin(orgSlug);

  const payload: MetadataPayload = {
    title: (t) => `${isReschedule ? t("reschedule") : ""} ${event.title} | ${profile.name}`,
    description: (t) => `${isReschedule ? t("reschedule") : ""} ${event.title}`,
    meeting: {
      title: event.title,
      profile: { name: profile.name, image: profile.image },
      users: event.users.map((user) => ({
        name: `${user.name}`,
        username: `${user.username}`,
      })),
    },
    robots: {
      index: !(event.hidden || !isSEOIndexable),
      follow: !(event.hidden || !isSEOIndexable),
    },
  };

  return {
    ...(await generateMeetingMetadata(
      payload.meeting,
      payload.title,
      payload.description,
      hideBranding,
      fullOrigin
    )),
    robots: payload.robots,
  };
};

export const generateUserProfilePageMetadata = async (props: UserProfilePageArgs) => {
  const { profile, hideBranding, orgSlug, isSEOIndexable } = props;
  const fullOrigin = getOrgFullOrigin(orgSlug);

  const payload: MetadataPayload = {
    title: () => profile.name ?? "",
    description: () => profile.markdownStrippedBio ?? "",
    meeting: {
      title: profile.markdownStrippedBio ?? "",
      profile: { name: profile.name ?? "", image: profile.image ?? "" },
      users: [{ name: profile.name ?? "", username: profile.username ?? "" }],
    },
    robots: {
      index: isSEOIndexable,
      follow: isSEOIndexable,
    },
  };

  return {
    ...(await generateMeetingMetadata(
      payload.meeting,
      payload.title,
      payload.description,
      hideBranding,
      fullOrigin
    )),
    robots: payload.robots,
  };
};

export const generateTeamProfilePageMetadata = async (props: TeamProfilePageArgs) => {
  const { profile, hideBranding, orgSlug, isSEOIndexable } = props;
  const fullOrigin = getOrgFullOrigin(orgSlug);

  const payload: MetadataPayload = {
    title: (t) => profile.teamName || t("nameless_team"),
    description: () => profile.markdownStrippedBio ?? "",
    meeting: {
      title: profile.markdownStrippedBio ?? "",
      profile: { name: `${profile.teamName}`, image: profile.image ?? "" },
    },
    robots: {
      index: isSEOIndexable,
      follow: isSEOIndexable,
    },
  };

  return {
    ...(await generateMeetingMetadata(
      payload.meeting,
      payload.title,
      payload.description,
      hideBranding,
      fullOrigin
    )),
    robots: payload.robots,
  };
};
