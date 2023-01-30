import { RouterOutputs } from "@calcom/trpc/react";

export type PublicEvent = NonNullable<RouterOutputs["viewer"]["public"]["event"]>;
