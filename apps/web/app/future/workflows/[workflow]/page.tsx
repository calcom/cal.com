import LegacyPage from "@pages/workflows/[workflow]";
import { withAppDirSsg } from "app/WithAppDirSsg";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { headers, cookies } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import { getStaticProps } from "~/workflows/workflow-single-view.getStaticProps";

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const { workflow } = await getData(buildLegacyCtx(headers(), cookies(), params, searchParams));
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
