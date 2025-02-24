import type { EventTypeColorsTransformedSchema, EventTypeColor_2024_06_14 } from "@calcom/platform-types";

export function transformEventTypeColorsInternalToApi(
  transformedColors: EventTypeColorsTransformedSchema
): EventTypeColor_2024_06_14 {
  return {
    darkThemeHex: transformedColors.darkEventTypeColor,
    lightThemeHex: transformedColors.lightEventTypeColor,
  };
}
