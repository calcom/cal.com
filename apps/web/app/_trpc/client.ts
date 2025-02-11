import { createTRPCReact } from "@calcom/trpc/react";
import type { AppRouter } from "@calcom/trpc/server/routers/_app";

export const trpc = createTRPCReact<AppRouter>({});
