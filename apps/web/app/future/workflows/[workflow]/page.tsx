import LegacyPage, { getStaticProps } from "@pages/workflows/[workflow]";
import { withAppDirSsg } from "app/WithAppDirSsg";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { type GetServerSidePropsContext } from "next";
import { headers, cookies } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

export const generateMetadata = async ({
  params,
  searchParams,
}: {
  params: Record<string, string | string[]>;
  searchParams: { [key: string]: string | string[] | undefined };
}) => {
  const { workflow } = await getData(
    buildLegacyCtx(headers(), cookies(), params, searchParams) as unknown as GetServerSidePropsContext
  );
  return await _generateMetadata(
    () => workflow ?? "Untitled",
    () => ""
  );
};

const getData = withAppDirSsg(getStaticProps);

export const generateStaticParams = () => [];

// @ts-expect-error TODO: fix this
export default WithLayout({ getLayout: null, getData, Page: LegacyPage })<"P">;
export const dynamic = "force-static";
// generate segments on demand
export const dynamicParams = true;
export const revalidate = 10;
