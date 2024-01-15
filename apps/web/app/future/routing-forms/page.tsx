import { type GetServerSidePropsContext } from "next";
import type { Params } from "next/dist/shared/lib/router/utils/route-matcher";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import z from "zod";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

const paramsSchema = z
  .object({
    pages: z.array(z.string()),
  })
  .catch({
    pages: [],
  });

const getPageProps = async (context: GetServerSidePropsContext) => {
  const { pages } = paramsSchema.parse(context.params);

  return redirect(`/apps/routing-forms/${pages.length ? pages.join("/") : ""}`);
};

type PageProps = Readonly<{
  params: Params;
}>;

const Page = async ({ params }: PageProps) => {
  const legacyCtx = buildLegacyCtx(headers(), cookies(), params);
  await getPageProps(legacyCtx as unknown as GetServerSidePropsContext);

  return null;
};

export default Page;
