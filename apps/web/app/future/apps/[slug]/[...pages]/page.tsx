import { withAppDirSsr } from "app/WithAppDirSsr";
import type { SearchParams } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import type { GetServerSidePropsResult } from "next";
import type { Params } from "next/dist/shared/lib/router/utils/route-matcher";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import z from "zod";

import { getServerSideProps } from "@lib/apps/[slug]/[...pages]/getServerSideProps";
import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import LegacyPage, { getLayout } from "~/apps/[slug]/[...pages]/pages-view";

const paramsSchema = z.object({
  slug: z.string(),
  pages: z.array(z.string()),
});

export const generateMetadata = async ({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) => {
  const p = paramsSchema.safeParse(params);

  if (!p.success) {
    return notFound();
  }

  const legacyContext = buildLegacyCtx(headers(), cookies(), params, searchParams);
  const data = await getData(legacyContext);
  const form = "form" in data ? (data.form as { name?: string; description?: string }) : null;
  const formName = form?.name ?? "Forms";
  const formDescription = form?.description ?? "";

  return await _generateMetadata(
    () => formName,
    () => formDescription
  );
};

const getData = withAppDirSsr<GetServerSidePropsResult<any>>(getServerSideProps);

export default WithLayout({
  getLayout,
  getData,
  Page: LegacyPage,
});
