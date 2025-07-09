import withEmbedSsrAppDir from "app/WithEmbedSSR";
import type { PageProps as ServerPageProps } from "app/_types";
import { generateMeetingMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";

import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";
import { getOrgOrTeamAvatar } from "@calcom/lib/defaultAvatarImage";

import { buildLegacyCtx, decodeParams } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/org/[orgSlug]/[user]/getServerSideProps";

import type { PageProps as TeamPageProps } from "~/team/team-view";
import TeamPage from "~/team/team-view";
import UserPage from "~/users/views/users-public-view";
import type { PageProps as UserPageProps } from "~/users/views/users-public-view";

const getData = withEmbedSsrAppDir<ClientPageProps>(getServerSideProps);

export type ClientPageProps = UserPageProps | TeamPageProps;

export const generateMetadata = async ({ params, searchParams }: ServerPageProps) => {
  const legacyCtx = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const props = await getData(legacyCtx);
  const decodedParams = decodeParams(await params);

  if ((props as TeamPageProps)?.team) {
    const { team, markdownStrippedBio, isSEOIndexable, currentOrgDomain } = props as TeamPageProps;
    const meeting = {
      title: markdownStrippedBio ?? "",
      profile: {
        name: `${team.name}`,
        image: getOrgOrTeamAvatar(team),
      },
    };
    return {
      ...(await generateMeetingMetadata(
        meeting,
        (t) => team.name ?? t("nameless_team"),
        (t) => team.name ?? t("nameless_team"),
        false,
        getOrgFullOrigin(currentOrgDomain ?? null),
        `/${decodedParams.user}/embed`
      )),
      robots: {
        index: isSEOIndexable,
        follow: isSEOIndexable,
      },
    };
  } else {
    const { profile, markdownStrippedBio, isOrgSEOIndexable, entity } = props as UserPageProps;

    const meeting = {
      title: markdownStrippedBio,
      profile: { name: `${profile.name}`, image: profile.image },
      users: [
        {
          username: `${profile.username ?? ""}`,
          name: `${profile.name ?? ""}`,
        },
      ],
    };
    const isOrg = !!profile?.organization;
    const allowSEOIndexing =
      (!isOrg && profile.allowSEOIndexing) || (isOrg && isOrgSEOIndexable && profile.allowSEOIndexing);
    return {
      ...(await generateMeetingMetadata(
        meeting,
        () => profile.name,
        () => markdownStrippedBio,
        false,
        getOrgFullOrigin(entity.orgSlug ?? null),
        `/${decodedParams.user}/embed`
      )),
      robots: {
        index: allowSEOIndexing,
        follow: allowSEOIndexing,
      },
    };
  }
};

const ServerPage = async ({ params, searchParams }: ServerPageProps) => {
  const context = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const props = await getData(context);
  if ((props as TeamPageProps)?.team) return <TeamPage {...(props as TeamPageProps)} />;
  return <UserPage {...(props as UserPageProps)} />;
};

export default ServerPage;
