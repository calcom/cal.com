/// <reference types="react" />
import type { RouterOutputs } from "@calcom/trpc/react";
type BookingItem = RouterOutputs["viewer"]["bookings"]["get"]["bookings"][number];
interface IViewRecordingsDialog {
    booking?: BookingItem;
    isOpenDialog: boolean;
    setIsOpenDialog: React.Dispatch<React.SetStateAction<boolean>>;
    timeFormat: number | null;
}
export declare const ViewRecordingsDialog: (props: IViewRecordingsDialog) => JSX.Element;
export default ViewRecordingsDialog;
//# sourceMappingURL=ViewRecordingsDialog.d.ts.map