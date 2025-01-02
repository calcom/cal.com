import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { generateUserProfilePageMetadata } from "app/generateBookingPageMetadata";
import { WithLayout } from "app/layoutHOC";
import { headers, cookies } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import { getServerSideProps } from "@server/lib/[user]/getServerSideProps";

import type { PageProps as LegacyPageProps } from "~/users/views/users-public-view";
import LegacyPage from "~/users/views/users-public-view";

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const props = await getData(buildLegacyCtx(headers(), cookies(), params, searchParams));

  const { profile, markdownStrippedBio, isOrgSEOIndexable, entity } = props;

  const isOrg = !!profile?.organization;
  const allowSEOIndexing = !!(
    (!isOrg && profile.allowSEOIndexing) ||
    (isOrg && isOrgSEOIndexable && profile.allowSEOIndexing)
  );
  return await generateUserProfilePageMetadata({
    profile: {
      name: profile.name,
      image: profile.image ?? "",
      username: profile.username ?? "",
      markdownStrippedBio: markdownStrippedBio,
    },
    event: null,
    hideBranding: false,
    orgSlug: entity.orgSlug ?? null,
    isSEOIndexable: allowSEOIndexing,
  });
};

const getData = withAppDirSsr<LegacyPageProps>(getServerSideProps);
export default WithLayout({ getData, Page: LegacyPage })<"P">;
