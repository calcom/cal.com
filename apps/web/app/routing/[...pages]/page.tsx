import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import type { GetServerSidePropsResult } from "next";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import z from "zod";

import { getServerSideProps } from "@lib/apps/[slug]/[...pages]/getServerSideProps";
import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import LegacyPage, { getLayout } from "~/apps/[slug]/[...pages]/pages-view";

const paramsSchema = z.object({
  pages: z.array(z.string()),
});

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const p = paramsSchema.safeParse(params);

  if (!p.success) {
    return notFound();
  }
  return await _generateMetadata(
    (t) => t("routing_forms"),
    (t) => t("routing_forms_description")
  );
};

const getData = withAppDirSsr<GetServerSidePropsResult<any>>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: PageProps) => {
  const ctx = buildLegacyCtx(headers(), cookies(), params, searchParams);
  const props = await getData(ctx);
  return <LegacyPage appName="routing-forms" {...props} />;
};

export default WithLayout({
  getLayout,
  ServerPage,
});
