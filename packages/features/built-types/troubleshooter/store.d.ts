/**
 * Arguments passed into store initializer, containing
 * the event data.
 */
type StoreInitializeType = {
    month: string | null;
};
type EventType = {
    id: number;
    slug: string;
    duration: number;
};
export type TroubleshooterStore = {
    event: EventType | null;
    setEvent: (eventSlug: EventType) => void;
    month: string | null;
    setMonth: (month: string | null) => void;
    selectedDate: string | null;
    setSelectedDate: (date: string | null) => void;
    addToSelectedDate: (days: number) => void;
    initialize: (data: StoreInitializeType) => void;
    calendarToColorMap: Record<string, string>;
    addToCalendarToColorMap: (calendarId: string | undefined, color: string) => void;
};
/**
 * The booker store contains the data of the component's
 * current state. This data can be reused within child components
 * by importing this hook.
 *
 * See comments in interface above for more information on it's specific values.
 */
export declare const useTroubleshooterStore: import("zustand").UseBoundStore<import("zustand").StoreApi<TroubleshooterStore>>;
export declare const useInitalizeTroubleshooterStore: ({ month }: StoreInitializeType) => void;
export {};
//# sourceMappingURL=store.d.ts.map