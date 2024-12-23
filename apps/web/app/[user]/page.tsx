import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { generateMeetingMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { headers, cookies } from "next/headers";

import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";
import { UserRepository } from "@calcom/lib/server/repository/user";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import { getServerSideProps } from "@server/lib/[user]/getServerSideProps";

import type { PageProps as LegacyPageProps } from "~/users/views/users-public-view";
import LegacyPage from "~/users/views/users-public-view";

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const props = await getData(buildLegacyCtx(headers(), cookies(), params, searchParams));

  const { profile, markdownStrippedBio, isOrgSEOIndexable, entity } = props;
  const avatarUrl = await UserRepository.getAvatarUrl(profile.id);
  const meeting = {
    title: markdownStrippedBio,
    profile: { name: `${profile.name}`, image: avatarUrl },
    users: [
      {
        username: `${profile.username ?? ""}`,
        name: `${profile.name ?? ""}`,
      },
    ],
  };

  const metadata = await generateMeetingMetadata(
    meeting,
    () => profile.name,
    () => markdownStrippedBio,
    false,
    getOrgFullOrigin(entity.orgSlug ?? null)
  );

  const isOrg = !!profile?.organization;
  const allowSEOIndexing =
    (!isOrg && profile.allowSEOIndexing) || (isOrg && isOrgSEOIndexable && profile.allowSEOIndexing);

  return {
    ...metadata,
    robots: {
      index: allowSEOIndexing,
      follow: allowSEOIndexing,
    },
  };
};

const getData = withAppDirSsr<LegacyPageProps>(getServerSideProps);
export default WithLayout({ getData, Page: LegacyPage })<"P">;
