import { withAppDirSsr } from "app/WithAppDirSsr";
import withEmbedSsrAppDir from "app/WithEmbedSSR";
import type { PageProps as _PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/team/[slug]/getServerSideProps";

import type { PageProps } from "~/team/team-view";
import TeamPage from "~/team/team-view";

const getData = withAppDirSsr<PageProps>(getServerSideProps);

export const generateMetadata = async ({ params, searchParams }: _PageProps) => {
  const props = await getData(buildLegacyCtx(headers(), cookies(), params, searchParams));

  return await _generateMetadata(
    (t) => props.team.name || t("nameless_team"),
    (t) => props.team.name || t("nameless_team")
  );
};

const getEmbedData = withEmbedSsrAppDir(getData);

export default WithLayout({
  Page: TeamPage,
  getData: getEmbedData,
  getLayout: null,
  isBookingPage: true,
})<"P">;
