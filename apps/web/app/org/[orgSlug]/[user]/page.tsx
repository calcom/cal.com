import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import {
  generateTeamProfilePageMetadata,
  generateUserProfilePageMetadata,
} from "app/generateBookingPageMetadata";
import { WithLayout } from "app/layoutHOC";
import { cookies, headers } from "next/headers";

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

  if ((props as TeamPageProps)?.team) {
    const { team, markdownStrippedBio, isSEOIndexable, currentOrgDomain } = props as TeamPageProps;
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
  } else {
    const { profile, markdownStrippedBio, isOrgSEOIndexable, entity } = props as UserPageProps;

    const isOrg = !!profile?.organization;
    const allowSEOIndexing =
      (!isOrg && profile.allowSEOIndexing) || (isOrg && isOrgSEOIndexable && profile.allowSEOIndexing);

    return await generateUserProfilePageMetadata({
      profile: { name: profile.name, username: profile.username, image: profile.image, markdownStrippedBio },
      hideBranding: false,
      orgSlug: entity.orgSlug ?? null,
      isSEOIndexable: !!allowSEOIndexing,
      event: null,
    });
  }
};

export const Page = async (props: OrgPageProps) => {
  if ((props as TeamPageProps)?.team) {
    return <TeamPage {...(props as TeamPageProps)} />;
  }
  return <UserPage {...(props as UserPageProps)} />;
};

export default WithLayout({ getLayout: null, getData, ServerPage: Page, isBookingPage: true });
