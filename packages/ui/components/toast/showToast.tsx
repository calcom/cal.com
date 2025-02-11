import { toast } from "sonner";

import { Icon } from "../icon";

const TOAST_VISIBLE_DURATION = 6000;

export type ToastOptions = {
  duration?: number;
};

export type ToastVariants = "success" | "warning" | "error";

export const SuccessToast = ({ message }: { message: string }) => (
  <div className="bg-brand-default text-brand mb-2 flex h-auto space-x-2 rounded-md p-3 text-sm font-semibold shadow-md md:max-w-sm">
    <span className="mt-0.5">
      <Icon name="check" className="h-4 w-4" />
    </span>
    <p>{message}</p>
  </div>
);

export const ErrorToast = ({ message }: { message: string }) => (
  <div className="bg-error text-error mb-2 flex h-auto space-x-2 rounded-md p-3 text-sm font-semibold shadow-md md:max-w-sm">
    <span className="mt-0.5">
      <Icon name="info" className="h-4 w-4" />
    </span>
    <p>{message}</p>
  </div>
);

export const WarningToast = ({ message }: { message: string }) => (
  <div className="bg-brand-default text-brand mb-2 flex h-auto space-x-2 rounded-md p-3 text-sm font-semibold shadow-md md:max-w-sm">
    <span className="mt-0.5">
      <Icon name="info" className="h-4 w-4" />
    </span>
    <p>{message}</p>
  </div>
);

export const DefaultToast = ({ message }: { message: string }) => (
  <div className="bg-brand-default text-brand mb-2 flex h-auto space-x-2 rounded-md p-3 text-sm font-semibold shadow-md md:max-w-sm">
    <span className="mt-0.5">
      <Icon name="check" className="h-4 w-4" />
    </span>
    <p>{message}</p>
  </div>
);

/**
 * @param variant - Type of notification ("success", "warning", or "error")
 * @param message -  message to display
 * @param options - Duration
 */
export function showToast(
  variant: ToastVariants,
  message: string,
  options: number | ToastOptions = TOAST_VISIBLE_DURATION
) {
  let duration: number = TOAST_VISIBLE_DURATION;
  if (typeof options === "number") {
    duration = options;
  } else if (typeof options === "object" && options.duration) {
    duration = options.duration;
  }

  switch (variant) {
    case "success":
      toast.success(message, { duration });
      break;
    case "error":
      toast.error(message, { duration });
      break;
    case "warning":
      toast(message, { duration, icon: "⚠️" });
      break;
    default:
      toast(message, { duration });
      break;
  }
}
