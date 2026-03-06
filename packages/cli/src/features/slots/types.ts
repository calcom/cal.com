import type {
  GetReservedSlotOutput_2024_09_04,
  ReserveSlotOutput_2024_09_04,
  SlotsController20240904GetAvailableSlotsResponse,
} from "../../generated/types.gen";

export type ReservedSlot = ReserveSlotOutput_2024_09_04;
export type GetReservedSlotResponse = GetReservedSlotOutput_2024_09_04["data"];

export type SlotsData = SlotsController20240904GetAvailableSlotsResponse;
