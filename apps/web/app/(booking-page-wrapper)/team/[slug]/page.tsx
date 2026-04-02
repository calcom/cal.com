import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";
import { getOrgOrTeamAvatar } from "@calcom/lib/defaultAvatarImage";
import { buildLegacyCtx, decodeParams } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/team/[slug]/getServerSideProps";
import type { PageProps as _PageProps } from "app/_types";
import { generateMeetingMetadata } from "app/_utils";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { cookies, headers } from "next/headers";
import type { PageProps } from "~/team/team-view";
import LegacyPage from "~/team/team-view";

export const generateMetadata = async ({ params, searchParams }: _PageProps) => {
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
  const props = await getData(
    buildLegacyCtx(await headers(), await cookies(), await params, await searchParams)
  );
  return <LegacyPage {...props} />;
};
export default ServerPage;
