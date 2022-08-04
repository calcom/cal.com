import { useSession } from "next-auth/react";

import { trpc } from "@calcom/trpc/react";

export default function useApp(appId: string) {
  const { status } = useSession();

  return trpc.useQuery(["viewer.appById", { appId }], {
    enabled: status === "authenticated",
  });
}
