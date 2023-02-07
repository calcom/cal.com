import { RouterOutputs } from "@calcom/trpc/react";

export type Schedule = RouterOutputs["viewer"]["public"]["slots"]["getSchedule"];
export type Slots = Schedule["slots"];
