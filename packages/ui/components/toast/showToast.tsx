import classNames from "classnames";
import toast from "react-hot-toast";

import { Check, Info } from "../icon";

type IToast = {
  message: string;
  toastVisible: boolean;
  toastId: string;
  onClose: (toastId: string) => void;
};

export const SuccessToast = ({ message, toastVisible, onClose, toastId }: IToast) => (
  <button
    className={classNames(
      "data-testid-toast-success bg-brand-default text-inverted mb-2 flex h-auto space-x-2 rounded-md p-3 text-sm font-semibold shadow-md rtl:space-x-reverse md:max-w-sm",
      toastVisible && "animate-fade-in-up cursor-pointer"
    )}
    onClick={() => onClose(toastId)}>
    <span className="mt-0.5">
      <Check className="h-4 w-4" />
    </span>
    <p data-testid="toast-success" className="text-left">
      {message}
    </p>
  </button>
);

export const ErrorToast = ({ message, toastVisible, onClose, toastId }: IToast) => (
  <button
    className={classNames(
      "animate-fade-in-up bg-error text-error mb-2 flex h-auto space-x-2 rounded-md p-3 text-sm font-semibold shadow-md rtl:space-x-reverse md:max-w-sm",
      toastVisible && "animate-fade-in-up cursor-pointer"
    )}
    onClick={() => onClose(toastId)}>
    <span className="mt-0.5">
      <Info className="h-4 w-4" />
    </span>
    <p data-testid="toast-error" className="text-left">
      {message}
    </p>
  </button>
);

export const WarningToast = ({ message, toastVisible, onClose, toastId }: IToast) => (
  <button
    className={classNames(
      "animate-fade-in-up bg-brand-default text-brand mb-2 flex h-auto space-x-2 rounded-md p-3 text-sm font-semibold shadow-md rtl:space-x-reverse md:max-w-sm",
      toastVisible && "animate-fade-in-up cursor-pointer"
    )}
    onClick={() => onClose(toastId)}>
    <span className="mt-0.5">
      <Info className="h-4 w-4" />
    </span>
    <p data-testid="toast-warning" className="text-left">
      {message}
    </p>
  </button>
);

export const DefaultToast = ({ message, toastVisible, onClose, toastId }: IToast) => (
  <button
    className={classNames(
      "animate-fade-in-up bg-brand-default text-inverted mb-2 flex h-auto space-x-2 rounded-md p-3 text-sm font-semibold shadow-md rtl:space-x-reverse md:max-w-sm",
      toastVisible && "animate-fade-in-up cursor-pointer"
    )}
    onClick={() => onClose(toastId)}>
    <span className="mt-0.5">
      <Check className="h-4 w-4" />
    </span>
    <p data-testid="toast-default" className="text-left">
      {message}
    </p>
  </button>
);

const TOAST_VISIBLE_DURATION = 6000;

export function showToast(
  message: string,
  variant: "success" | "warning" | "error",
  duration = TOAST_VISIBLE_DURATION
) {
  const onClose = (toastId: string) => {
    toast.remove(toastId);
  };
  switch (variant) {
    case "success":
      return toast.custom(
        (t) => <SuccessToast message={message} toastVisible={t.visible} onClose={onClose} toastId={t.id} />,
        { duration }
      );
    case "error":
      return toast.custom(
        (t) => <ErrorToast message={message} toastVisible={t.visible} onClose={onClose} toastId={t.id} />,
        { duration }
      );
    case "warning":
      return toast.custom(
        (t) => <WarningToast message={message} toastVisible={t.visible} onClose={onClose} toastId={t.id} />,
        { duration }
      );
    default:
      return toast.custom(
        (t) => <DefaultToast message={message} toastVisible={t.visible} onClose={onClose} toastId={t.id} />,
        { duration }
      );
  }
}
