import { useSession } from "next-auth/react";

import { CALCOM_VERSION } from "@calcom/lib/constants";
import { symmetricEncrypt } from "@calcom/lib/crypto";
import { trpc } from "@calcom/trpc/react";

export function useViewerI18n(locale: string) {
  const session = useSession();
  const token = encodeURIComponent(
    symmetricEncrypt(session.data?.user.email || "Email-less", process.env.CALENDSO_ENCRYPTION_KEY || "")
  );
  return trpc.viewer.public.i18n.useQuery(
    { locale, CalComVersion: CALCOM_VERSION, token },
    {
      /**
       * i18n should never be clubbed with other queries, so that it's caching can be managed independently.
       **/
      trpc: {
        context: { skipBatch: true },
      },
    }
  );
}
