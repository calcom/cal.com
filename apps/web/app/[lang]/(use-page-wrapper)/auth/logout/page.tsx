import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import { ssrInit } from "@server/lib/ssr";

import Logout from "~/auth/logout-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return await _generateMetadata(t("logged_out"), t("youve_been_logged_out"));
};

const Page = async ({ params, searchParams }: PageProps) => {
  // cookie will be cleared in `/apps/web/middleware.ts`
  const h = headers();
  const context = buildLegacyCtx(h, cookies(), params, searchParams);
  await ssrInit(context);

  return <Logout query={context.query} />;
};

export default Page;
