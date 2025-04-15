import * as React from "react";
import { toast } from "sonner";

import { Icon } from "../icon";

type ProgressToastProps = {
  message: string;
  progress: number;
  toastId: string | number;
  onClose: (toastId: string | number) => void;
};

export const ProgressToast = ({ message, progress, onClose, toastId }: ProgressToastProps) => {
  return (
    <div className="animate-fade-in-up bg-default dark:bg-inverted text-emphasis dark:text-inverted shadow-elevation-low border-subtle mb-2 flex h-auto flex-col space-y-2 rounded-lg border px-3 py-2.5 text-sm font-semibold md:max-w-sm">
      <div className="flex justify-between">
        <div className="flex space-x-2">
          <span className="mt-0.5">
            <Icon name="file-down" className="h-4 w-4" />
          </span>
          <p className="m-0 w-full text-left">{message}</p>
        </div>
        <button onClick={() => onClose(toastId)}>
          <Icon name="x" className="h-4 w-4 hover:cursor-pointer" />
        </button>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="bg-brand-default h-2 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="text-right text-xs font-normal">{Math.floor(progress)}%</div>
    </div>
  );
};

export function showProgressToast(message: string, progress: number, toastId = "download-progress") {
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
