import type { Dayjs } from "@calcom/dayjs";
export declare function useCheckOverlapWithOverlay({ start, selectedDuration, offset, }: {
    start: Dayjs;
    selectedDuration: number | null;
    offset: number;
}): {
    isOverlapping: boolean;
    overlappingTimeStart: string | null;
    overlappingTimeEnd: string | null;
};
//# sourceMappingURL=useCheckOverlapWithOverlay.d.ts.map