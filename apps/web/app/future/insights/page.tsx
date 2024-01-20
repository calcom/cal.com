import LegacyPage from "@pages/insights/index";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { notFound } from "next/navigation";

import { getLayout } from "@calcom/features/MainLayoutAppDir";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getFeatureFlagMap } from "@calcom/features/flags/server/utils";

import type { buildLegacyCtx } from "@lib/buildLegacyCtx";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "Insights",
    (t) => t("insights_subtitle")
  );

async function getData(context: ReturnType<typeof buildLegacyCtx>) {
  const prisma = await import("@calcom/prisma").then((mod) => mod.default);
  const session = await getServerSession({ req: context.req });
  const flags = await getFeatureFlagMap(prisma, session?.user.id);

  if (flags.insights === false) {
    return notFound();
  }

  return {};
}

export default WithLayout({ getLayout, getData, Page: LegacyPage });
