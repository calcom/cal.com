import * as React from "react";
import { toast } from "sonner";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Icon } from "../icon";

type ProgressToastProps = {
  message?: string;
  progress: number;
  toastId: string | number;
  onClose: (toastId: string | number) => void;
};

export const ProgressToast = ({ message, progress, onClose, toastId }: ProgressToastProps) => {
  const { t } = useLocale();
  const defaultMessage = t("downloading");

  return (
    <div className="animate-fade-in-up bg-subtle shadow-elevation-low border-subtle stack-y-2 mb-2 flex h-auto flex-col rounded-lg border px-3 py-2.5 text-sm font-semibold md:max-w-sm">
      <div className="flex items-center gap-2">
        <span className="mt-0.5">
          <Icon name="file-down" className="h-4 w-4" />
        </span>
        <p className="m-0 w-full text-left">{message || defaultMessage}</p>
        <button onClick={() => onClose(toastId)} aria-label={t("close")}>
          <Icon name="x" className="h-4 w-4 hover:cursor-pointer" />
        </button>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full">
        <div
          className="bg-inverted h-2 rounded-full opacity-50 transition-all duration-300 ease-in-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="text-right text-xs font-normal">{Math.floor(progress)}%</div>
    </div>
  );
};

export function showProgressToast(progress: number, message?: string, toastId = "download-progress") {
  const onClose = (id: string | number) => {
    toast.dismiss(id);
  };

  return toast.custom(
    (id) => <ProgressToast message={message} progress={progress} onClose={onClose} toastId={id} />,
    {
      id: toastId,
      duration: Infinity, // Keep the toast visible until dismissed
      position: "bottom-center",
    }
  );
}

export function hideProgressToast(toastId = "download-progress") {
  toast.dismiss(toastId);
}
