import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import OutOfOfficeInsightsPage from "~/insights/out-of-office-insights-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("out_of_office_insights"),
    (t) => t("out_of_office_insights_subtitle"),
    undefined,
    undefined,
    "/insights/out-of-office"
  );

const ServerPage = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  const { timeZone } = await prisma.user.findUniqueOrThrow({
    where: { id: session?.user.id ?? -1 },
    select: {
      timeZone: true,
    },
  });

  return <OutOfOfficeInsightsPage timeZone={timeZone} />;
};

export default ServerPage;
