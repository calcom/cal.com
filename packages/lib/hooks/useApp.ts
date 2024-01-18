import { useSession } from "next-auth/react";

import { trpc } from "@calcom/trpc/react";
import type { UseTRPCQueryResult } from "@calcom/trpc/react/shared";
import type { AppByIdHandlerReturn } from "@calcom/trpc/server/routers/loggedInViewer/appById.handler";

export default function useApp(appId: string): UseTRPCQueryResult<AppByIdHandlerReturn, unknown> {
  const { status } = useSession();

  return trpc.viewer.appById.useQuery(
    { appId },
    {
      enabled: status === "authenticated",
    }
  );
}
