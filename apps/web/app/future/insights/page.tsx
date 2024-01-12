import LegacyPage from "@pages/insights/index";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { notFound } from "next/navigation";

import { getLayout } from "@calcom/features/MainLayoutAppDir";
import { getFeatureFlagMap } from "@calcom/features/flags/server/utils";

import type { buildLegacyCtx } from "@lib/buildLegacyCtx";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "Insights",
    (t) => t("insights_subtitle")
  );

async function getData(context: ReturnType<typeof buildLegacyCtx>) {
  // @ts-expect-error Type '{ headers: ReadonlyHeaders; cookies: ReadonlyRequestCookies; }' is not assignable to type 'NextApiRequest | (IncomingMessage & { cookies: Partial<{ [key: string]: string; }>; })'.
  const flags = await getFeatureFlagMap(context.req);

  if (flags.insights === false) {
    return notFound();
  }

  return {};
}

export default WithLayout({ getLayout, getData, Page: LegacyPage });
