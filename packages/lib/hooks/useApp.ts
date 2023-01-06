import { useSession } from "next-auth/react";

import { trpc, RouterOutputs } from "@calcom/trpc/react";

export default function useApp(appId: string): RouterOutputs["viewer"]["appById"][number] {
  const { status } = useSession();

  return trpc.viewer.appById.useQuery(
    { appId },
    {
      enabled: status === "authenticated",
    }
  );
}
