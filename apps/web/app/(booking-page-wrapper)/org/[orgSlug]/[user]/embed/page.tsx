import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/org/[orgSlug]/[user]/getServerSideProps";
import type { PageProps as ServerPageProps } from "app/_types";
import withEmbedSsrAppDir from "app/WithEmbedSSR";
import { cookies, headers } from "next/headers";
import type { PageProps as TeamPageProps } from "~/team/team-view";
import TeamPage from "~/team/team-view";
import type { PageProps as UserPageProps } from "~/users/views/users-public-view";
import UserPage from "~/users/views/users-public-view";

const getData = withEmbedSsrAppDir<ClientPageProps>(getServerSideProps);

export type ClientPageProps = UserPageProps | TeamPageProps;

export const generateMetadata = async () => {
  return {
    robots: {
      follow: false,
      index: false,
    },
  };
};

const ServerPage = async ({ params, searchParams }: ServerPageProps) => {
  const context = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const props = await getData(context);
  if ((props as TeamPageProps)?.team) return <TeamPage {...(props as TeamPageProps)} />;
  return <UserPage {...(props as UserPageProps)} />;
};

export default ServerPage;
