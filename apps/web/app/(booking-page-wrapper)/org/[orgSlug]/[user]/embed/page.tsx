import withEmbedSsrAppDir from "app/WithEmbedSSR";
import type { PageProps as ServerPageProps } from "app/_types";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/org/[orgSlug]/[user]/getServerSideProps";

import type { PageProps as TeamPageProps } from "~/team/team-view";
import TeamPage from "~/team/team-view";
import UserPage from "~/users/views/users-public-view";
import type { PageProps as UserPageProps } from "~/users/views/users-public-view";

const getData = withEmbedSsrAppDir<ClientPageProps>(getServerSideProps);

export type ClientPageProps = UserPageProps | TeamPageProps;

export const generateMetadata = async ({ params, searchParams }: ServerPageProps) => {
  const legacyCtx = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const props = await getData(legacyCtx);

  if ((props as TeamPageProps)?.team) {
    const { isSEOIndexable } = props as TeamPageProps;
    return {
      robots: {
        index: isSEOIndexable,
        follow: isSEOIndexable,
      },
    };
  } else {
    const { profile, isOrgSEOIndexable } = props as UserPageProps;

    const isOrg = !!profile?.organization;
    const allowSEOIndexing =
      (!isOrg && profile.allowSEOIndexing) || (isOrg && isOrgSEOIndexable && profile.allowSEOIndexing);
    return {
      robots: {
        index: allowSEOIndexing,
        follow: allowSEOIndexing,
      },
    };
  }
};

const ServerPage = async ({ params, searchParams }: ServerPageProps) => {
  const context = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const props = await getData(context);
  if ((props as TeamPageProps)?.team) return <TeamPage {...(props as TeamPageProps)} />;
  return <UserPage {...(props as UserPageProps)} />;
};

export default ServerPage;
