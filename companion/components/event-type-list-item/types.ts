import { EventType } from "../../services/types/event-types.types";

export interface EventTypeListItemProps {
  item: EventType;
  index: number;
  filteredEventTypes: EventType[];
  copiedEventTypeId: number | null;
  handleEventTypePress: (item: EventType) => void;
  handleEventTypeLongPress: (item: EventType) => void;
  handleCopyLink: (item: EventType) => void;
  handlePreview: (item: EventType) => void;
  onEdit?: (item: EventType) => void;
  onDuplicate?: (item: EventType) => void;
  onDelete?: (item: EventType) => void;
}
