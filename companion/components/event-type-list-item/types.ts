import type { EventType } from "@/services/types/event-types.types";

export interface EventTypeListItemProps {
  item: EventType;
  index: number;
  filteredEventTypes: EventType[];
  handleEventTypePress: (item: EventType) => void;
  handleCopyLink: (item: EventType) => void;
  handlePreview: (item: EventType) => void;
  onEdit?: (item: EventType) => void;
  onDuplicate?: (item: EventType) => void;
  onDelete?: (item: EventType) => void;
}
