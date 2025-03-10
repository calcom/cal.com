import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as _PageProps } from "app/_types";
import { generateMeetingMetadata, getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";

import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";
import { getOrgOrTeamAvatar } from "@calcom/lib/defaultAvatarImage";

import { buildLegacyCtx, decodeParams } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/team/[slug]/getServerSideProps";

import type { PageProps } from "~/team/team-view";
import LegacyPage from "~/team/team-view";

export const generateMetadata = async ({ params, searchParams }: _PageProps) => {
  const { team, markdownStrippedBio, isSEOIndexable, currentOrgDomain } = await getData(
    buildLegacyCtx(headers(), cookies(), params, searchParams)
  );
  const t = await getTranslate(params.lang);

  const meeting = {
    title: markdownStrippedBio ?? "",
    profile: {
      name: `${team.name}`,
      image: getOrgOrTeamAvatar(team),
    },
  };
  const decodedParams = decodeParams(params);
  const metadata = await generateMeetingMetadata(
    meeting,
    team.name || t("nameless_team"),
    team.name || t("nameless_team"),
    false,
    getOrgFullOrigin(currentOrgDomain ?? null),
    `/team/${decodedParams.slug}`
  );
  return {
    ...metadata,
    robots: {
      follow: isSEOIndexable,
      index: isSEOIndexable,
    },
  };
};

const getData = withAppDirSsr<PageProps>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: _PageProps) => {
  const props = await getData(buildLegacyCtx(headers(), cookies(), params, searchParams));
  return <LegacyPage {...props} />;
};
export default ServerPage;
