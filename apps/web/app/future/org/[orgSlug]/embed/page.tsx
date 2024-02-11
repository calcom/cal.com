import { type PageProps } from "@pages/team/[slug]";
import EmbedPage from "@pages/team/[slug]/embed";
import { withAppDirSsr } from "app/WithAppDirSsr";
import withEmbedSsrAppDir from "app/WithEmbedSSR";
import type { Params, SearchParams } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { type GetServerSidePropsContext } from "next";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/team/[slug]/getServerSideProps";

const getData = withAppDirSsr<PageProps>(getServerSideProps);

export const generateMetadata = async ({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) => {
  const props = await getData(
    buildLegacyCtx(headers(), cookies(), params, searchParams) as unknown as GetServerSidePropsContext
  );
  const teamName = props.team.name || "Nameless Team";

  return await _generateMetadata(
    () => teamName,
    () => teamName
  );
};

const getEmbedData = withEmbedSsrAppDir(getData);

export default WithLayout({
  Page: EmbedPage,
  getData: getEmbedData,
  getLayout: null,
  isBookingPage: true,
})<"P">;
