import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { trpc } from "@calcom/trpc/react";

export const useAppCredentials = (appSlug: string) => {
  const { data: session } = useSession();
  const [credentials, setCredentials] = useState<any[]>([]);

  const { data: apps, isLoading } = (trpc.viewer as any).apps.listLocal.useQuery(
    { category: "other" },
    {
      enabled: !!session?.user?.id,
    }
  );

  useEffect(() => {
    if (apps && !isLoading) {
      const appData = apps.find((app: any) => app.slug === appSlug);
      if (appData && "credentials" in appData) {
        setCredentials((appData as any).credentials || []);
      }
    }
  }, [apps, isLoading, appSlug]);

  return credentials;
};
