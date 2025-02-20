import classNames from "classnames";
import type { ToastOptions, Toast } from "react-hot-toast";
import toast from "react-hot-toast";

import { Icon } from "../icon";

type IToast = {
  message: string;
  toastVisible: boolean;
  toastId: string;
  onClose: (toastId: string) => void;
};

export const SuccessToast = ({ message, toastVisible, onClose, toastId }: IToast) => (
  <button
    className={classNames(
      "data-testid-toast-success bg-default dark:bg-inverted text-emphasis dark:text-inverted shadow-elevation-low border-subtle mb-2 flex h-auto space-x-2 rounded-lg border px-3 py-2.5 text-sm font-semibold rtl:space-x-reverse md:max-w-sm",
      toastVisible && "animate-fade-in-up cursor-pointer"
    )}
    onClick={() => onClose(toastId)}>
    <span className="mt-0.5">
      <Icon name="check" className="h-4 w-4" />
    </span>
    <p data-testid="toast-success" className="m-0 w-full text-left">
      {message}
    </p>
    <span className="mt-0.5">
      <Icon name="x" className="h-4 w-4 hover:cursor-pointer" />
    </span>
  </button>
);

export const ErrorToast = ({ message, toastVisible, onClose, toastId }: IToast) => (
  <button
    className={classNames(
      "animate-fade-in-up bg-semantic-error-subtle text-semantic-error shadow-elevation-low border-semantic-error-subtle mb-2 flex h-auto space-x-2 rounded-md border px-3 py-2.5 text-sm font-semibold rtl:space-x-reverse md:max-w-sm",
      toastVisible && "animate-fade-in-up cursor-pointer"
    )}
    onClick={() => onClose(toastId)}>
    <span className="mt-0.5">
      <Icon name="info" className="text-semantic-error h-4 w-4" />
    </span>
    <p data-testid="toast-error" className="m-0 w-full text-left">
      {message}
    </p>
    <span className="mt-0.5">
      <Icon name="x" className="text-semantic-error h-4 w-4 hover:cursor-pointer" />
    </span>
  </button>
);

export const WarningToast = ({ message, toastVisible, onClose, toastId }: IToast) => (
  <button
    className={classNames(
      "animate-fade-in-up bg-semantic-attention-subtle text-semantic-attention shadow-elevation-low border-semantic-attention-subtle mb-2 flex h-auto space-x-2 rounded-md border px-3 py-2.5 text-sm font-semibold rtl:space-x-reverse md:max-w-sm",
      toastVisible && "animate-fade-in-up cursor-pointer"
    )}
    onClick={() => onClose(toastId)}>
    <span className="mt-0.5">
      <Icon name="info" className="text-semantic-attention h-4 w-4" />
    </span>
    <p data-testid="toast-warning" className="m-0 w-full text-left">
      {message}
    </p>
    <span className="mt-0.5">
      <Icon name="x" className="text-semantic-attention h-4 w-4 hover:cursor-pointer" />
    </span>
  </button>
);

const TOAST_VISIBLE_DURATION = 6000;

type ToastVariants = "success" | "warning" | "error";

export function showToast(
  message: string,
  variant: ToastVariants,
  // Options or duration (duration for backwards compatibility reasons)
  options: number | ToastOptions = TOAST_VISIBLE_DURATION
) {
  //
  const _options: ToastOptions = typeof options === "number" ? { duration: options } : options;
  if (!_options.duration) _options.duration = TOAST_VISIBLE_DURATION;
  if (!_options.position) _options.position = "bottom-center";

  const onClose = (toastId: string) => {
    toast.remove(toastId);
  };
  const toastElements: { [x in ToastVariants]: (t: Toast) => JSX.Element } = {
    success: (t) => (
      <SuccessToast message={message} toastVisible={t.visible} onClose={onClose} toastId={t.id} />
    ),
    error: (t) => <ErrorToast message={message} toastVisible={t.visible} onClose={onClose} toastId={t.id} />,
    warning: (t) => (
      <WarningToast message={message} toastVisible={t.visible} onClose={onClose} toastId={t.id} />
    ),
  };
  return toast.custom(
    toastElements[variant] ||
      ((t) => <SuccessToast message={message} toastVisible={t.visible} onClose={onClose} toastId={t.id} />),
    _options
  );
}
