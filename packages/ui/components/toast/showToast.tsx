import classNames from "classnames";
import type { ToastT } from "sonner";
import { toast } from "sonner";

import { Icon } from "../icon";

type IToast = {
  message: string;
  toastId: string | number;
  onClose: (toastId: string | number) => void;
};

export const SuccessToast = ({ message, onClose, toastId }: IToast) => (
  <button
    className={classNames(
      "data-testid-toast-success bg-default dark:bg-inverted text-emphasis dark:text-inverted shadow-elevation-low border-subtle mb-2 flex h-auto space-x-2 rounded-lg border px-3 py-2.5 text-sm font-semibold rtl:space-x-reverse md:max-w-sm"
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

export const ErrorToast = ({ message, onClose, toastId }: IToast) => (
  <button
    className={classNames(
      "animate-fade-in-up bg-semantic-error-subtle text-semantic-error shadow-elevation-low border-semantic-error-subtle mb-2 flex h-auto space-x-2 rounded-md border px-3 py-2.5 text-sm font-semibold rtl:space-x-reverse md:max-w-sm"
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

export const WarningToast = ({ message, onClose, toastId }: IToast) => (
  <button
    className={classNames(
      "animate-fade-in-up bg-semantic-attention-subtle text-semantic-attention shadow-elevation-low border-semantic-attention-subtle mb-2 flex h-auto space-x-2 rounded-md border px-3 py-2.5 text-sm font-semibold rtl:space-x-reverse md:max-w-sm"
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
  options: number | ToastT = TOAST_VISIBLE_DURATION
) {
  const _options: ToastT = typeof options === "number" ? { duration: options, id: "" } : options;
  if (!_options.duration) _options.duration = TOAST_VISIBLE_DURATION;
  if (!_options.position) _options.position = "bottom-center";

  const onClose = (toastId: string | number) => {
    toast.dismiss(toastId);
  };

  const toastElements: { [x in ToastVariants]: (t: number | string) => JSX.Element } = {
    success: (toastId) => <SuccessToast message={message} onClose={onClose} toastId={toastId} />,
    error: (toastId) => <ErrorToast message={message} onClose={onClose} toastId={toastId} />,
    warning: (toastId) => <WarningToast message={message} onClose={onClose} toastId={toastId} />,
  };

  return toast.custom(
    toastElements[variant] ||
      ((toastId) => <SuccessToast message={message} onClose={onClose} toastId={toastId} />),
    _options
  );
}
