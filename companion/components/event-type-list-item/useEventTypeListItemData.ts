import type { EventType } from "@/services/types/event-types.types";
import { formatDuration } from "@/utils/formatters";
import { getEventDuration } from "@/utils/getEventDuration";
import { normalizeMarkdown } from "@/utils/normalizeMarkdown";

export interface EventTypeListItemData {
  duration: number;
  formattedDuration: string;
  normalizedDescription: string | null;
  hasPrice: boolean;
  formattedPrice: string | null;
}

/**
 * Extracts and computes derived data from an event type object.
 * This hook centralizes the logic shared between iOS and non-iOS EventTypeListItem components.
 */
export function useEventTypeListItemData(item: EventType): EventTypeListItemData {
  const duration = getEventDuration(item);
  const formattedDuration = formatDuration(duration);
  const normalizedDescription = item.description ? normalizeMarkdown(item.description) : null;
  const hasPrice = item.price != null && item.price > 0;
  const formattedPrice = hasPrice ? `${item.currency || "$"}${item.price}` : null;

  return {
    duration,
    formattedDuration,
    normalizedDescription,
    hasPrice,
    formattedPrice,
  };
}
