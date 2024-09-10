import type { PageProps } from "app/_types";
import { type GetServerSidePropsContext } from "next";
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

const Page = async ({ params, searchParams }: PageProps) => {
  const legacyCtx = buildLegacyCtx(headers(), cookies(), params, searchParams);
  await getPageProps(legacyCtx);

  return null;
};

export default Page;
