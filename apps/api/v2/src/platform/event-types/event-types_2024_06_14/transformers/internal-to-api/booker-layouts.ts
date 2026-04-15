import {
  BookerLayoutsInputEnum_2024_06_14,
  BookerLayoutsOutputEnum_2024_06_14,
} from "@calcom/platform-enums";
import type { BookerLayoutsTransformedSchema } from "@calcom/platform-types";

export function transformBookerLayoutsInternalToApi(
  transformedBookerLayouts: BookerLayoutsTransformedSchema
) {
  const outputToInputMap = {
    [BookerLayoutsOutputEnum_2024_06_14.month_view]: BookerLayoutsInputEnum_2024_06_14.month,
    [BookerLayoutsOutputEnum_2024_06_14.week_view]: BookerLayoutsInputEnum_2024_06_14.week,
    [BookerLayoutsOutputEnum_2024_06_14.column_view]: BookerLayoutsInputEnum_2024_06_14.column,
  };

  return {
    defaultLayout: outputToInputMap[transformedBookerLayouts.defaultLayout],
    enabledLayouts: transformedBookerLayouts.enabledLayouts.map((layout) => outputToInputMap[layout]),
  };
}
