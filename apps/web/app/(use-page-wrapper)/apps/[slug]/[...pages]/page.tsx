import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as ServerPageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import type { GetServerSidePropsResult } from "next";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import z from "zod";

import { getServerSideProps } from "@lib/apps/[slug]/[...pages]/getServerSideProps";
import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import LegacyPage from "~/apps/[slug]/[...pages]/pages-view";

const paramsSchema = z.object({
  slug: z.string(),
  pages: z.array(z.string()),
});

export const generateMetadata = async ({ params, searchParams }: ServerPageProps) => {
  const p = paramsSchema.safeParse(params);

  if (!p.success) {
    return notFound();
  }

  const legacyContext = buildLegacyCtx(headers(), cookies(), params, searchParams);
  const data = await getData(legacyContext);
  const form = "form" in data ? (data.form as { name?: string; description?: string }) : null;
  const formName = form?.name;
  const formDescription = form?.description;

  return await _generateMetadata(
    (t) => formName ?? t("routing_forms"),
    (t) => formDescription ?? t("routing_forms_description")
  );
};

const getData = withAppDirSsr<GetServerSidePropsResult<any>>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: ServerPageProps) => {
  const context = buildLegacyCtx(headers(), cookies(), params, searchParams);

  const props = await getData(context);
  return <LegacyPage {...props} />;
};

export default ServerPage;
