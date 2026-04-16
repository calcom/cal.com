import {
  BookerLayoutsInputEnum_2024_06_14,
  BookerLayoutsOutputEnum_2024_06_14,
} from "@calcom/platform-enums";
import { type CreateEventTypeInput_2024_06_14 } from "@calcom/platform-types";

export function transformBookerLayoutsApiToInternal(
  inputBookerLayout: CreateEventTypeInput_2024_06_14["bookerLayouts"]
) {
  if (!inputBookerLayout) return undefined;

  const inputToOutputMap = {
    [BookerLayoutsInputEnum_2024_06_14.month]: BookerLayoutsOutputEnum_2024_06_14.month_view,
    [BookerLayoutsInputEnum_2024_06_14.week]: BookerLayoutsOutputEnum_2024_06_14.week_view,
    [BookerLayoutsInputEnum_2024_06_14.column]: BookerLayoutsOutputEnum_2024_06_14.column_view,
  };

  return {
    defaultLayout: inputToOutputMap[inputBookerLayout.defaultLayout],
    enabledLayouts: inputBookerLayout.enabledLayouts.map((layout) => inputToOutputMap[layout]),
  };
}
