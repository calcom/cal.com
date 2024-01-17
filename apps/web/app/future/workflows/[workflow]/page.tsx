import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { type GetServerSidePropsContext } from "next";
import { headers, cookies } from "next/headers";
import { notFound } from "next/navigation";
import { z } from "zod";

import LegacyPage from "@calcom/features/ee/workflows/pages/workflow";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

const querySchema = z.object({
  workflow: z.string(),
});

export const generateMetadata = async ({
  params,
  searchParams,
}: {
  params: Record<string, string | string[]>;
  searchParams: { [key: string]: string | string[] | undefined };
}) => {
  const { workflow } = await getProps(
    buildLegacyCtx(headers(), cookies(), params, searchParams) as unknown as GetServerSidePropsContext
  );
  return await _generateMetadata(
    () => workflow ?? "Untitled",
    () => ""
  );
};

async function getProps(context: GetServerSidePropsContext) {
  const safeParams = querySchema.safeParse(context.params);

  console.log("Built workflow page:", safeParams);
  if (!safeParams.success) {
    return notFound();
  }
  return { workflow: safeParams.data.workflow };
}

export const generateStaticParams = () => [];

export default WithLayout({ getLayout: null, getData: getProps, Page: LegacyPage })<"P">;
export const dynamic = "force-static";
// generate segments on demand
export const dynamicParams = true;
export const revalidate = 10;
