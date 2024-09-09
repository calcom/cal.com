/// <reference types="react" />
type Props = {
    /**
     * Whether to show the exact number of seats available or not
     *
     * @default true
     */
    showExact: boolean;
    /**
     * Shows available seats count as either whole number or fraction.
     *
     * Applies only when `showExact` is `true`
     *
     * @default "whole"
     */
    variant?: "whole" | "fraction";
    /** Number of seats booked in the event */
    bookedSeats: number;
    /** Total number of seats in the event */
    totalSeats: number;
};
export declare const SeatsAvailabilityText: ({ showExact, bookedSeats, totalSeats, variant, }: Props) => JSX.Element;
export {};
//# sourceMappingURL=SeatsAvailabilityText.d.ts.map