import type { RouterOutputs } from "@calcom/trpc/react";

export type Slots = RouterOutputs["viewer"]["slots"]["getSchedule"]["slots"];

export type Slot = Slots[string][number] & {
  showConfirmButton?: boolean;
  /** Shown on booker when reason is "Other" (ooo_reasons_other) */
  specifiedReason?: string | null;
};

export type GetSchedule = RouterOutputs["viewer"]["slots"]["getSchedule"];
