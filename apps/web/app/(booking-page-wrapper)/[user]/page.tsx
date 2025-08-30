import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { generateMeetingMetadata } from "app/_utils";
import { headers, cookies } from "next/headers";

import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";

import { buildLegacyCtx, decodeParams } from "@lib/buildLegacyCtx";

import { getServerSideProps } from "@server/lib/[user]/getServerSideProps";

import type { PageProps as LegacyPageProps } from "~/users/views/users-public-view";
import LegacyPage from "~/users/views/users-public-view";

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const props = await getData(
    buildLegacyCtx(await headers(), await cookies(), await params, await searchParams)
  );

  const { profile, markdownStrippedBio, isOrgSEOIndexable, entity } = props;
  const isOrg = !!profile?.organization;
  const allowSEOIndexing =
    (!isOrg && profile.allowSEOIndexing) || (isOrg && isOrgSEOIndexable && profile.allowSEOIndexing);

  const meeting = {
    title: markdownStrippedBio,
    profile: { name: `${profile.name}`, image: profile.image },
    users: [{ username: `${profile.username}`, name: `${profile.name}` }],
  };
  const metadata = await generateMeetingMetadata(
    meeting,
    () => profile.name,
    () => markdownStrippedBio,
    false,
    getOrgFullOrigin(entity.orgSlug ?? null),
    `/${decodeParams(await params).user}`
  );

  return {
    ...metadata,
    robots: {
      follow: allowSEOIndexing,
      index: allowSEOIndexing,
    },
  };
};

const getData = withAppDirSsr<LegacyPageProps>(getServerSideProps);
const ServerPage = async ({ params, searchParams }: PageProps) => {
  const props = await getData(
    buildLegacyCtx(await headers(), await cookies(), await params, await searchParams)
  );

  return <LegacyPage {...props} />;
};

export default ServerPage;
