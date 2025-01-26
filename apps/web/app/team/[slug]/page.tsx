import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as _PageProps } from "app/_types";
import { generateMeetingMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { cookies, headers } from "next/headers";

import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";
import { getOrgOrTeamAvatar } from "@calcom/lib/defaultAvatarImage";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/team/[slug]/getServerSideProps";

import type { PageProps } from "~/team/team-view";
import LegacyPage from "~/team/team-view";

export const generateMetadata = async ({ params, searchParams }: _PageProps) => {
  const { team, markdownStrippedBio, isSEOIndexable, currentOrgDomain } = await getData(
    buildLegacyCtx(headers(), cookies(), params, searchParams)
  );

  const meeting = {
    title: markdownStrippedBio ?? "",
    profile: {
      name: `${team.name}`,
      image: getOrgOrTeamAvatar(team),
    },
  };

  const metadata = await generateMeetingMetadata(
    meeting,
    (t) => team.name || t("nameless_team"),
    (t) => team.name || t("nameless_team"),
    false,
    getOrgFullOrigin(currentOrgDomain ?? null)
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

export default WithLayout({
  Page: LegacyPage,
  getData,
  getLayout: null,
  isBookingPage: true,
})<"P">;
