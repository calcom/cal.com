import { CALCOM_VERSION } from "@calcom/lib/constants";
import { trpc } from "@calcom/trpc/react";

export function useViewerI18n(locale: string) {
  return trpc.viewer.public.i18n.useQuery(
    { locale, CalComVersion: CALCOM_VERSION },
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
