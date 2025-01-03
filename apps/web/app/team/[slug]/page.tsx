import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as _PageProps } from "app/_types";
import { generateTeamProfilePageMetadata } from "app/generateBookingPageMetadata";
import { WithLayout } from "app/layoutHOC";
import { cookies, headers } from "next/headers";

import { getOrgOrTeamAvatar } from "@calcom/lib/defaultAvatarImage";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/team/[slug]/getServerSideProps";

import type { PageProps } from "~/team/team-view";
import LegacyPage from "~/team/team-view";

export const generateMetadata = async ({ params, searchParams }: _PageProps) => {
  const { team, markdownStrippedBio, isSEOIndexable, currentOrgDomain } = await getData(
    buildLegacyCtx(headers(), cookies(), params, searchParams)
  );

  return await generateTeamProfilePageMetadata({
    profile: {
      teamName: team.name,
      image: getOrgOrTeamAvatar(team),
      markdownStrippedBio: markdownStrippedBio,
    },
    event: null,
    hideBranding: false,
    orgSlug: currentOrgDomain ?? null,
    isSEOIndexable: !!isSEOIndexable,
  });
};

const getData = withAppDirSsr<PageProps>(getServerSideProps);

export default WithLayout({
  Page: LegacyPage,
  getData,
  getLayout: null,
  isBookingPage: true,
})<"P">;
