/// <reference types="react" />
import type { CalendarEvent } from "../../types/events";
type EventProps = {
    event: CalendarEvent;
    currentlySelectedEventId?: number;
    eventDuration: number;
    onEventClick?: (event: CalendarEvent) => void;
    disabled?: boolean;
};
export declare function Event({ event, currentlySelectedEventId, eventDuration, disabled, onEventClick, }: EventProps): JSX.Element;
export {};
//# sourceMappingURL=Event.d.ts.map