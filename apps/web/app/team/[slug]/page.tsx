import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as _PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { cookies, headers } from "next/headers";

import { constructMeetingImage } from "@calcom/lib/OgImages";
import { SEO_IMG_OGIMG } from "@calcom/lib/constants";
import { getOrgOrTeamAvatar } from "@calcom/lib/defaultAvatarImage";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/team/[slug]/getServerSideProps";

import type { PageProps } from "~/team/team-view";
import LegacyPage from "~/team/team-view";

export const generateMetadata = async ({ params, searchParams }: _PageProps) => {
  const { team, markdownStrippedBio } = await getData(
    buildLegacyCtx(headers(), cookies(), params, searchParams)
  );

  const meeting = {
    title: markdownStrippedBio ?? "",
    profile: {
      name: `${team.name}`,
      image: getOrgOrTeamAvatar(team),
    },
  };
  const image = SEO_IMG_OGIMG + constructMeetingImage(meeting);

  const metadata = await _generateMetadata(
    (t) => team.name || t("nameless_team"),
    (t) => team.name || t("nameless_team")
  );
  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      images: [image],
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
