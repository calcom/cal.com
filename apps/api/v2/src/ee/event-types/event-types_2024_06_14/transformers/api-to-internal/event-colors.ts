import type {
  CreateEventTypeInput_2024_06_14,
  EventTypeColorsTransformedSchema,
} from "@calcom/platform-types";

export function transformEventColorsApiToInternal(
  inputEventTypeColors: CreateEventTypeInput_2024_06_14["color"]
): EventTypeColorsTransformedSchema | undefined {
  if (!inputEventTypeColors) return undefined;

  return {
    darkEventTypeColor: inputEventTypeColors.darkThemeHex,
    lightEventTypeColor: inputEventTypeColors.lightThemeHex,
  };
}
