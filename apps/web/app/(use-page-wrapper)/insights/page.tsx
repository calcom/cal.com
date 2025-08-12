import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";

import InsightsPage from "~/insights/insights-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("insights"),
    (t) => t("insights_subtitle"),
    undefined,
    undefined,
    "/insights"
  );

const ServerPage = async () => {
  const req = {
    headers: (await headers()) as any,
    cookies: (await cookies()) as any,
  } as any;
  const session = await getServerSession({ req: { headers: req.headers, cookies: req.cookies } as any });

  const { timeZone } = await prisma.user.findUniqueOrThrow({
    where: { id: session?.user.id ?? -1 },
    select: {
      timeZone: true,
    },
  });

  return <InsightsPage timeZone={timeZone} />;
};

export default ServerPage;
