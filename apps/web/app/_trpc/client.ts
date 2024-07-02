import type { AppRouter } from "@calcom/trpc/server/routers/_app";

import { createTRPCReact } from "@trpc/react-query";

export const trpc = createTRPCReact<AppRouter>({});
