import type { RouterOutputs } from "@calcom/trpc/react";

export type Slots = RouterOutputs["viewer"]["slots"]["getSchedule"]["slots"];

export type Slot = Slots[string][number] & { showConfirmButton?: boolean };

export type GetSchedule = RouterOutputs["viewer"]["slots"]["getSchedule"];
