/// <reference types="react" />
interface IWipeMyCalActionButtonProps {
    bookingsEmpty: boolean;
    bookingStatus: "upcoming" | "recurring" | "past" | "cancelled" | "unconfirmed";
}
declare const WipeMyCalActionButton: (props: IWipeMyCalActionButtonProps) => JSX.Element;
export { WipeMyCalActionButton };
//# sourceMappingURL=wipeMyCalActionButton.d.ts.map