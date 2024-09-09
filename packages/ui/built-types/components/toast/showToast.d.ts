/// <reference types="react" />
import type { ToastOptions } from "react-hot-toast";
type IToast = {
    message: string;
    toastVisible: boolean;
    toastId: string;
    onClose: (toastId: string) => void;
};
export declare const SuccessToast: ({ message, toastVisible, onClose, toastId }: IToast) => JSX.Element;
export declare const ErrorToast: ({ message, toastVisible, onClose, toastId }: IToast) => JSX.Element;
export declare const WarningToast: ({ message, toastVisible, onClose, toastId }: IToast) => JSX.Element;
export declare const DefaultToast: ({ message, toastVisible, onClose, toastId }: IToast) => JSX.Element;
type ToastVariants = "success" | "warning" | "error";
export declare function showToast(message: string, variant: ToastVariants, options?: number | ToastOptions): string;
export {};
//# sourceMappingURL=showToast.d.ts.map