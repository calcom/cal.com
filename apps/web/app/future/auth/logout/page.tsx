import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import PageWrapper from "@components/PageWrapperAppDir";

import { ssrInit } from "@server/lib/ssr";

import Logout from "~/auth/logout-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("logged_out"),
    (t) => t("youve_been_logged_out")
  );
};

const Page = async ({ params, searchParams }: PageProps) => {
  // cookie will be cleared in `/apps/web/middleware.ts`
  const h = headers();
  const nonce = h.get("x-nonce") ?? undefined;
  const context = buildLegacyCtx(h, cookies(), params, searchParams);
  const ssr = await ssrInit(context);
  const props = {
    trpcState: ssr.dehydrate(),
    query: context.query,
  };

  return (
    <PageWrapper requiresLicense={false} getLayout={null} nonce={nonce} themeBasis={null}>
      <Logout {...props} />
    </PageWrapper>
  );
};

export default Page;
