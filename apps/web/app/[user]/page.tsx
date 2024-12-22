import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { headers, cookies } from "next/headers";

import { getServerSessionForAppDir } from "@calcom/feature-auth/lib/get-server-session-for-app-dir";
import { constructMeetingImage } from "@calcom/lib/OgImages";
import { SEO_IMG_OGIMG } from "@calcom/lib/constants";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import { getServerSideProps } from "@server/lib/[user]/getServerSideProps";

import type { PageProps as LegacyPageProps } from "~/users/views/users-public-view";
import LegacyPage from "~/users/views/users-public-view";

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const props = await getData(buildLegacyCtx(headers(), cookies(), params, searchParams));

  const { profile, markdownStrippedBio } = props;
  const metadata = await _generateMetadata(
    () => profile.name,
    () => markdownStrippedBio
  );
  const session = await getServerSessionForAppDir();
  const user = session?.user;

  const meeting = {
    title: markdownStrippedBio,
    profile: { name: `${profile.name}`, image: user?.avatarUrl ?? null },
    users: [
      {
        username: `${profile.username ?? ""}`,
        name: `${profile.name ?? ""}`,
      },
    ],
  };
  const image = SEO_IMG_OGIMG + constructMeetingImage(meeting);
  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      images: [image],
    },
  };
};

const getData = withAppDirSsr<LegacyPageProps>(getServerSideProps);
export default WithLayout({ getData, Page: LegacyPage })<"P">;
