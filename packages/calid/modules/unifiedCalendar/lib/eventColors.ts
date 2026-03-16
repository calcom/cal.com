import { EXTERNAL_PROVIDER_COLOR_FAMILIES, INTERNAL_EVENT_COLOR_FAMILY, PALETTE } from "./constants";
import type { SupportedCalendarProvider, UnifiedEventSource } from "./types";

interface DeriveUnifiedEventColorInput {
  source: UnifiedEventSource;
  provider?: SupportedCalendarProvider | null;
  calendarIdentity?: string | null;
  explicitColor?: string | null;
}

const stringHash = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const deriveUnifiedEventColor = ({
  source,
  provider,
  calendarIdentity,
  explicitColor,
}: DeriveUnifiedEventColorInput): string => {
  if (explicitColor && explicitColor.trim().length > 0) {
    return explicitColor;
  }

  if (source === "INTERNAL") {
    return INTERNAL_EVENT_COLOR_FAMILY.primary;
  }

  if (provider && EXTERNAL_PROVIDER_COLOR_FAMILIES[provider]) {
    const palette = EXTERNAL_PROVIDER_COLOR_FAMILIES[provider];
    if (!calendarIdentity) {
      return palette[0];
    }

    return palette[stringHash(calendarIdentity) % palette.length];
  }

  return PALETTE.neutralGray;
};
