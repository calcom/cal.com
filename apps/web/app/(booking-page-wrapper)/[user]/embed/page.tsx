import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@server/lib/[user]/getServerSideProps";
import type { PageProps as ServerPageProps } from "app/_types";
import withEmbedSsrAppDir from "app/WithEmbedSSR";
import { cookies, headers } from "next/headers";
import User, { type PageProps as ClientPageProps } from "~/users/views/users-public-view";

export const generateMetadata = async () => {
  return {
    robots: {
      follow: false,
      index: false,
    },
  };
};

const getData = withEmbedSsrAppDir<ClientPageProps>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: ServerPageProps) => {
  const context = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const props = await getData(context);
  return <User {...props} />;
};

export default ServerPage;
