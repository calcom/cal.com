import { useSession } from "next-auth/react";

import { trpc, RouterOutputs } from "@calcom/trpc/react";

export default function useApp(appId: string) {
  const { status } = useSession();

  return trpc.viewer.appById.useQuery(
    { appId },
    {
      enabled: status === "authenticated",
    }
  );
}
