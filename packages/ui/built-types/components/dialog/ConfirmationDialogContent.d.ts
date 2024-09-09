import type { PropsWithChildren, ReactElement } from "react";
import React from "react";
type ConfirmBtnType = {
    confirmBtn?: never;
    confirmBtnText?: string;
} | {
    confirmBtnText?: never;
    confirmBtn?: ReactElement;
};
export type ConfirmationDialogContentProps = {
    cancelBtnText?: string;
    isPending?: boolean;
    loadingText?: string;
    onConfirm?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
    title: string;
    variety?: "danger" | "warning" | "success";
} & ConfirmBtnType;
export declare function ConfirmationDialogContent(props: PropsWithChildren<ConfirmationDialogContentProps>): JSX.Element;
export declare const ConfirmationContent: (props: PropsWithChildren<ConfirmationDialogContentProps>) => JSX.Element;
export {};
//# sourceMappingURL=ConfirmationDialogContent.d.ts.map