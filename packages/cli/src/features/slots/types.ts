import type { ReserveSlotOutput_2024_09_04 } from "../../generated/types.gen";

export type ReservedSlot = ReserveSlotOutput_2024_09_04;

export interface SlotRange {
  start?: string;
  end?: string;
}

export type SlotsData = Record<string, (string | SlotRange)[]>;
