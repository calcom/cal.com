import type { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/app-store/zod-utils";
import type { z } from "zod";

/**
 * Server-safe subset of BookerEvent type.
 * This type is used by server code that needs to access event type metadata
 * without pulling in React/TRPC client dependencies.
 */
export type BookerEventForAppData = {
  price: number;
  currency: string;
  metadata: z.infer<typeof eventTypeMetaDataSchemaWithTypedApps> | null;
};
