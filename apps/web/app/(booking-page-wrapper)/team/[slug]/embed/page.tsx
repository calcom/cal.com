import withEmbedSsrAppDir from "app/WithEmbedSSR";
import type { PageProps as ServerPageProps } from "app/_types";
import { generateMeetingMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";

import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";
import { getOrgOrTeamAvatar } from "@calcom/lib/defaultAvatarImage";

import { buildLegacyCtx, decodeParams } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/team/[slug]/getServerSideProps";

import TeamPage, { type PageProps as ClientPageProps } from "~/team/team-view";

export const generateMetadata = async ({ params, searchParams }: ServerPageProps) => {
  const { team, markdownStrippedBio, isSEOIndexable, currentOrgDomain } = await getData(
    buildLegacyCtx(await headers(), await cookies(), await params, await searchParams)
  );

  const meeting = {
    title: markdownStrippedBio ?? "",
    profile: {
      name: `${team.name}`,
      image: getOrgOrTeamAvatar(team),
    },
  };
  const decodedParams = decodeParams(await params);
  const metadata = await generateMeetingMetadata(
    meeting,
    (t) => team.name || t("nameless_team"),
    (t) => team.name || t("nameless_team"),
    false,
    getOrgFullOrigin(currentOrgDomain ?? null),
    `/team/${decodedParams.slug}/embed`
  );
  return {
    ...metadata,
    robots: {
      follow: isSEOIndexable,
      index: isSEOIndexable,
    },
  };
};

const getData = withEmbedSsrAppDir<ClientPageProps>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: ServerPageProps) => {
  const context = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const props = await getData(context);
  return <TeamPage {...props} />;
};

export default ServerPage;
