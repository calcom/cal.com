import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { cookies, headers } from "next/headers";

import { getServerSessionForAppDir } from "@calcom/features/auth/lib/get-server-session-for-app-dir";
import { constructMeetingImage } from "@calcom/lib/OgImages";
import { SEO_IMG_OGIMG } from "@calcom/lib/constants";
import { getOrgOrTeamAvatar } from "@calcom/lib/defaultAvatarImage";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/org/[orgSlug]/[user]/getServerSideProps";

import type { PageProps as TeamPageProps } from "~/team/team-view";
import TeamPage from "~/team/team-view";
import UserPage from "~/users/views/users-public-view";
import type { PageProps as UserPageProps } from "~/users/views/users-public-view";

export type OrgPageProps = UserPageProps | TeamPageProps;
const getData = withAppDirSsr<OrgPageProps>(getServerSideProps);

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const legacyCtx = buildLegacyCtx(headers(), cookies(), params, searchParams);
  const props = await getData(legacyCtx);
  let metadata, meeting;
  if ((props as TeamPageProps)?.team) {
    const { team, markdownStrippedBio } = props as TeamPageProps;
    meeting = {
      title: markdownStrippedBio ?? "",
      profile: {
        name: `${team.name}`,
        image: getOrgOrTeamAvatar(team),
      },
    };

    metadata = await _generateMetadata(
      (t) => team.name ?? t("nameless_team"),
      (t) => team.name ?? t("nameless_team")
    );
  } else {
    const { profile, markdownStrippedBio } = props as UserPageProps;
    metadata = await _generateMetadata(
      () => profile.name,
      () => markdownStrippedBio
    );
    const session = await getServerSessionForAppDir();
    const user = session?.user;
    meeting = {
      title: markdownStrippedBio,
      profile: { name: `${profile.name}`, image: user?.avatarUrl ?? null },
      users: [
        {
          username: `${profile.username ?? ""}`,
          name: `${profile.name ?? ""}`,
        },
      ],
    };
  }
  const image = SEO_IMG_OGIMG + constructMeetingImage(meeting);
  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      images: [image],
    },
  };
};

export const Page = async (props: OrgPageProps) => {
  if ((props as TeamPageProps)?.team) {
    return <TeamPage {...(props as TeamPageProps)} />;
  }
  return <UserPage {...(props as UserPageProps)} />;
};

export default WithLayout({ getLayout: null, getData, ServerPage: Page, isBookingPage: true });
