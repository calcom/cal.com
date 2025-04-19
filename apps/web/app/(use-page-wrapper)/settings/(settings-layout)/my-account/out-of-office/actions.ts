import { cookies, headers } from "next/headers";

import { getLocale } from "@calcom/features/auth/lib/getLocale";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { createContextInner } from "@calcom/trpc/server/createContext";
import { appRouter, type AppRouter } from "@calcom/trpc/server/routers/_app";
import { createCallerFactory } from "@calcom/trpc/server/trpc";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import type { inferRouterOutputs } from "@trpc/server";

type OooListOutput = inferRouterOutputs<AppRouter>["viewer"]["ooo"]["outOfOfficeEntriesList"];

export async function getOutOfOfficeData(): Promise<OooListOutput> {
  const headersList = await headers();
  const cookieStore = await cookies();

  const legacyReq = buildLegacyRequest(headersList, cookieStore);

  const locale = headersList.get("x-locale") ?? (await getLocale(legacyReq));

  const session = await getServerSession({ req: legacyReq });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const context = await createContextInner({ locale, session });

  const createCaller = createCallerFactory<AppRouter>(appRouter);
  const caller = createCaller(context);

  const rawInitialOooData: OooListOutput = await caller.viewer.ooo.outOfOfficeEntriesList({
    limit: 10,
    fetchTeamMembersEntries: false,
    searchTerm: undefined,
    endDateFilterStartRange: undefined,
    endDateFilterEndRange: undefined,
  });

  return rawInitialOooData;
}
