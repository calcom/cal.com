import OldPage from "@pages/teams/index";
import { ssrInit } from "app/_trpc/ssrInit";
import { type Params } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { type GetServerSidePropsContext } from "next";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getLayout } from "@calcom/features/MainLayoutAppDir";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import PageWrapper from "@components/PageWrapperAppDir";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("teams"),
    (t) => t("create_manage_teams_collaborative")
  );

type PageProps = {
  params: Params;
};

async function getData(context: Omit<GetServerSidePropsContext, "res" | "resolvedUrl">) {
  const ssr = await ssrInit();
  await ssr.viewer.me.prefetch();

  const session = await getServerSession({
    req: context.req,
  });

  if (!session) {
    const token = Array.isArray(context.query.token) ? context.query.token[0] : context.query.token;

    const callbackUrl = token ? `/teams?token=${encodeURIComponent(token)}` : null;
    return redirect(callbackUrl ? `/auth/login?callbackUrl=${callbackUrl}` : "/auth/login");
  }

  return { dehydratedState: await ssr.dehydrate() };
}

const Page = async ({ params }: PageProps) => {
  const h = headers();
  const nonce = h.get("x-nonce") ?? undefined;

  const legacyCtx = buildLegacyCtx(h, cookies(), params);
  // @ts-expect-error `req` of type '{ headers: ReadonlyHeaders; cookies: ReadonlyRequestCookies; }' is not assignable to `req` in `GetServerSidePropsContext`
  const props = await getData(legacyCtx);

  return (
    <PageWrapper
      getLayout={getLayout}
      requiresLicense={false}
      nonce={nonce}
      themeBasis={null}
      dehydratedState={props.dehydratedState}>
      <OldPage />
    </PageWrapper>
  );
};

export default Page;
