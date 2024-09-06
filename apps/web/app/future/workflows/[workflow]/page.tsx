import { withAppDirSsg } from "app/WithAppDirSsg";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { headers, cookies } from "next/headers";

import LegacyPage from "@calcom/features/ee/workflows/pages/workflow";
import { WorkflowRepository } from "@calcom/lib/server/repository/workflow";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getStaticProps } from "@lib/workflows/[workflow]/getStaticProps";

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const { workflow: id } = await getData(buildLegacyCtx(headers(), cookies(), params, searchParams));
  const workflow = await WorkflowRepository.getById({ id: +id });

  return await _generateMetadata(
    () => (workflow && workflow.name ? workflow.name : "Untitled"),
    () => ""
  );
};

const getData = withAppDirSsg(getStaticProps);

export const generateStaticParams = () => [];

export default WithLayout({ getLayout: null, getData, Page: LegacyPage })<"P">;
export const dynamic = "force-static";
// generate segments on demand
export const dynamicParams = true;
export const revalidate = 10;
