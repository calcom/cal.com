import { withAppDirSsr } from "app/WithAppDirSsr";
import type { SearchParams } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import type { Params } from "next/dist/shared/lib/router/utils/route-matcher";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import z from "zod";

import type { inferSSRProps } from "@calcom/types/inferSSRProps";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import LegacyPage, { getLayout, getServerSideProps } from "~/apps/[slug]/[...pages]/pages-view";

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

  const mainPage = p.data.pages[0];

  if (mainPage === "forms") {
    return await _generateMetadata(
      () => `Forms`,
      () => ""
    );
  }

  const legacyContext = buildLegacyCtx(headers(), cookies(), params, searchParams);
  const { form } = await getData(legacyContext);

  return await _generateMetadata(
    () => `${form.name}`,
    () => form.description
  );
};

type T = inferSSRProps<typeof getServerSideProps>;
// @ts-expect-error TODO: fix the type error
const getData = withAppDirSsr<T>(getServerSideProps);

export default WithLayout({
  getLayout,
  getData,
  Page: LegacyPage,
});
