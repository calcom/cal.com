import type { DehydratedState } from "@tanstack/react-query";

import type { LegacyCtx } from "@lib/buildLegacyCtx";

export async function getLogoutData(
  context: LegacyCtx,
  getTrpcState: () => Promise<DehydratedState>,
  trpcStateKey: "trpcState" | "dehydratedState"
) {
  context.req.cookies.delete("next-auth.session-token");

  return {
    props: {
      [trpcStateKey]: await getTrpcState(),
      query: context.query,
    },
  };
}
