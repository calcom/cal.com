import type { RouterOutputs } from "@calcom/trpc/react";

export type Slots = RouterOutputs["viewer"]["public"]["slots"]["getSchedule"]["slots"];

export type GetSchedule = RouterOutputs["viewer"]["public"]["slots"]["getSchedule"];
