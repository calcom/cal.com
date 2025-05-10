import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { generateMeetingMetadata } from "app/_utils";
import { headers, cookies } from "next/headers";
import { cache } from "react";

import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import { getServerSideProps } from "@server/lib/[user]/getServerSideProps";

import type { PageProps as LegacyPageProps } from "~/users/views/users-public-view";
import LegacyPage from "~/users/views/users-public-view";

const getCtx = cache(async (params: PageProps["params"], searchParams: PageProps["searchParams"]) => {
  return buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
});

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const ctx = await getCtx(params, searchParams);
  const props = await getData(ctx);

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
    `/${ctx.params?.user}`
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
  const ctx = await getCtx(params, searchParams);
  const props = await getData(ctx);

  return <LegacyPage {...props} />;
};

export default ServerPage;
