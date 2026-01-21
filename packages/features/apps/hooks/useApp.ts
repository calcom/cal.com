import { useSession } from "next-auth/react";

import { trpc } from "@calcom/trpc/react";

export default function useApp(appId: string, options?: { enabled?: boolean }) {
  const { status } = useSession();

  return trpc.viewer.apps.appById.useQuery(
    { appId },
    {
      enabled: status === "authenticated" && (options?.enabled ?? true),
    }
  );
}
