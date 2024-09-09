/// <reference types="react" />
export interface Timezone {
    name: string;
    offset: number;
    isdst?: boolean;
    abbr?: string;
    city?: string;
    location?: string;
}
export interface TimezoneBuddyProps {
    browsingDate: Date;
    timeMode?: "12h" | "24h";
}
type TimezoneBuddyState = TimezoneBuddyProps & {
    addToDate: (amount: number) => void;
    subtractFromDate: (amount: number) => void;
    setBrowseDate: (date: Date) => void;
};
export type TimezoneBuddyStore = ReturnType<typeof createTimezoneBuddyStore>;
/**
 * Differnt type of zustand store compared to what we are used to
 * This is a function that returns a store instead of a hook. This allows us to properly set the initial state of the store
 * from the props passed in to the component.
 */
export declare const createTimezoneBuddyStore: (initProps?: Partial<TimezoneBuddyProps>) => import("zustand").StoreApi<TimezoneBuddyState>;
export declare const TBContext: import("react").Context<import("zustand").StoreApi<TimezoneBuddyState> | null>;
export {};
//# sourceMappingURL=store.d.ts.map