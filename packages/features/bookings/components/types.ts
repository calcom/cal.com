import { RouterOutputs } from "@calcom/trpc/react";

export type PublicEvent = NonNullable<RouterOutputs["viewer"]["public"]["event"]>;

export enum EventDetailBlocks {
  DESCRIPTION,
  // Includes duration select when event has multiple durations.
  DURATION,
  LOCATION,
  REQUIRES_CONFIRMATION,
  // Includes input to select # of occurences.
  OCCURENCES,
  PRICE,
}
