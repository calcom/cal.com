import classNames from "classnames";
import toast from "react-hot-toast";

import { Check, Info } from "../icon";

type IToast = {
  message: string;
  toastVisible: boolean;
  onClose: () => void;
};

export const SuccessToast = ({ message, toastVisible, onClose }: IToast) => (
  <div
    className={classNames(
      "data-testid-toast-success bg-brand-default text-inverted mb-2 flex h-auto items-center space-x-2 rounded-md p-3 text-sm font-semibold shadow-md rtl:space-x-reverse md:max-w-sm",
      toastVisible && "animate-fade-in-up cursor-pointer"
    )}
    onClick={onClose}>
    <span>
      <Check className="h-4 w-4" />
    </span>
    <p data-testid="toast-success">{message}</p>
  </div>
);

export const ErrorToast = ({ message, toastVisible, onClose }: IToast) => (
  <div
    className={classNames(
      "animate-fade-in-up bg-error text-error mb-2 flex h-auto items-center space-x-2 rounded-md p-3 text-sm font-semibold shadow-md rtl:space-x-reverse md:max-w-sm",
      toastVisible && "animate-fade-in-up cursor-pointer"
    )}
    onClick={onClose}>
    <span>
      <Info className="h-4 w-4" />
    </span>
    <p data-testid="toast-error">{message}</p>
  </div>
);

export const WarningToast = ({ message, toastVisible, onClose }: IToast) => (
  <div
    className={classNames(
      "animate-fade-in-up bg-brand-default text-brand mb-2 flex h-auto items-center space-x-2 rounded-md p-3 text-sm font-semibold shadow-md rtl:space-x-reverse md:max-w-sm",
      toastVisible && "animate-fade-in-up cursor-pointer"
    )}
    onClick={onClose}>
    <span>
      <Info className="h-4 w-4" />
    </span>
    <p data-testid="toast-warning">{message}</p>
  </div>
);

export const DefaultToast = ({ message, toastVisible, onClose }: IToast) => (
  <div
    className={classNames(
      "animate-fade-in-up bg-brand-default text-inverted mb-2 flex h-auto items-center space-x-2 rounded-md p-3 text-sm font-semibold shadow-md rtl:space-x-reverse md:max-w-sm",
      toastVisible && "animate-fade-in-up cursor-pointer"
    )}
    onClick={onClose}>
    <span>
      <Check className="h-4 w-4" />
    </span>
    <p>{message}</p>
  </div>
);

const TOAST_VISIBLE_DURATION = 6000;

export function showToast(
  message: string,
  variant: "success" | "warning" | "error",
  duration = TOAST_VISIBLE_DURATION
) {
  const onClose = () => {
    toast.dismiss();
  };
  switch (variant) {
    case "success":
      return toast.custom(
        (t) => <SuccessToast message={message} toastVisible={t.visible} onClose={onClose} />,
        { duration }
      );
    case "error":
      return toast.custom(
        (t) => <ErrorToast message={message} toastVisible={t.visible} onClose={onClose} />,
        { duration }
      );
    case "warning":
      return toast.custom(
        (t) => <WarningToast message={message} toastVisible={t.visible} onClose={onClose} />,
        { duration }
      );
    default:
      return toast.custom(
        (t) => <DefaultToast message={message} toastVisible={t.visible} onClose={onClose} />,
        { duration }
      );
  }
}
