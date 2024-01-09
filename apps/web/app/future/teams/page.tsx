import OldPage from "@pages/teams/index";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { redirect } from "next/navigation";

import { getLayout } from "@calcom/features/MainLayoutAppDir";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import type { buildLegacyCtx } from "@lib/buildLegacyCtx";

import { ssrInit } from "@server/lib/ssr";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("teams"),
    (t) => t("create_manage_teams_collaborative")
  );

async function getData(context: ReturnType<typeof buildLegacyCtx>) {
  // @ts-expect-error Argument of type '{ query: Params; params: Params; req: { headers: ReadonlyHeaders; cookies: ReadonlyRequestCookies; }; }' is not assignable to parameter of type 'GetServerSidePropsContext'.
  const ssr = await ssrInit(context);

  await ssr.viewer.me.prefetch();

  const session = await getServerSession({
    // @ts-expect-error Type '{ headers: ReadonlyHeaders; cookies: ReadonlyRequestCookies; }' is not assignable to type 'NextApiRequest | (IncomingMessage & { cookies: Partial<{ [key: string]: string; }>; })'.
    req: context.req,
  });

  if (!session) {
    const token = Array.isArray(context.query.token) ? context.query.token[0] : context.query.token;

    const callbackUrl = token ? `/teams?token=${encodeURIComponent(token)}` : null;
    return redirect(callbackUrl ? `/auth/login?callbackUrl=${callbackUrl}` : "/auth/login");
  }

  return { dehydratedState: ssr.dehydrate() };
}

export default WithLayout({ getData, getLayout, Page: OldPage })<"P">;
