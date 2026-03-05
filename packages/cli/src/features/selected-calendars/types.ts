import type { SelectedCalendarOutputDto, SelectedCalendarOutputResponseDto } from "../../generated/types.gen";

export type { SelectedCalendarOutputDto, SelectedCalendarOutputResponseDto };

export type SelectedCalendar = SelectedCalendarOutputDto;
export type SelectedCalendarResponse = SelectedCalendarOutputResponseDto["data"];

export interface SelectedCalendarListResponse {
  status: string;
  data: SelectedCalendar[];
}
