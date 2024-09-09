/// <reference types="react" />
import type { IOutOfOfficeData } from "@calcom/core/getUserAvailability";
interface IOutOfOfficeInSlotsProps {
    date: string;
    fromUser?: IOutOfOfficeData["anyDate"]["fromUser"];
    toUser?: IOutOfOfficeData["anyDate"]["toUser"];
    emoji?: string;
    reason?: string;
    borderDashed?: boolean;
    className?: string;
}
export declare const OutOfOfficeInSlots: (props: IOutOfOfficeInSlotsProps) => JSX.Element | null;
export {};
//# sourceMappingURL=OutOfOfficeInSlots.d.ts.map