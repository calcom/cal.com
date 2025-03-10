import type { AppRouter } from "@calcom/trpc/types/AppRouter";

import { createTRPCReact } from "@trpc/react-query";

export const trpc = createTRPCReact<AppRouter>({});
