import LegacyPage, { getServerSideProps, type PageProps } from "@pages/team/[slug]";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { type GetServerSidePropsContext } from "next";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

export const generateMetadata = async ({
  params,
  searchParams,
}: {
  params: Record<string, string | string[]>;
  searchParams: { [key: string]: string | string[] | undefined };
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

const getData = withAppDirSsr<PageProps>(getServerSideProps);

export default WithLayout({
  Page: LegacyPage,
  getData,
  getLayout: null,
  isBookingPage: true,
})<"P">;
