import { Icon } from "@calid/features/ui/components/icon";
import { toast, type ExternalToast } from "sonner";

const TOAST_VISIBLE_DURATION = 6000;

type ToastVariants = "success" | "warning" | "error";

export function triggerToast(
  message: string,
  variant: ToastVariants = "success",
  options: number | ExternalToast = TOAST_VISIBLE_DURATION
) {
  const opts: ExternalToast = typeof options === "number" ? { duration: options } : { ...options };

  if (!opts.duration) opts.duration = TOAST_VISIBLE_DURATION;
  if (!opts.position) opts.position = "bottom-center";

  return toast.custom(
    (id) => (
      <button
        onClick={() => toast.dismiss(id)}
        className={`py-22 flex items-center gap-2 rounded-lg border p-2 text-sm font-semibold shadow-lg md:max-w-sm
        ${variant === "success" ? "bg-green-100 text-green-800" : ""}
        ${variant === "error" ? "bg-red-100 text-red-800" : ""}
        ${variant === "warning" ? "bg-yellow-100 text-yellow-800" : ""}
      `}>
        <Icon name={variant === "success" ? "check" : "info"} className="size-4" />
        <span>{message}</span>
        <Icon name="x" className="ml-auto size-4" />
      </button>
    ),
    opts
  );
}
