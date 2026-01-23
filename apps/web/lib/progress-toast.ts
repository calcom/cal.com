import { toastManager } from "@coss/ui/components/toast";

const abortControllers = new Map<string, AbortController>();

export function showProgressToast(
  progress: number,
  message?: string,
  toastId = "download-progress",
  abortController?: AbortController
): string {
  if (abortController) {
    abortControllers.set(toastId, abortController);
  }

  const existingToast = toastManager.toasts.find((t) => t.id === toastId);

  if (existingToast) {
    toastManager.update(toastId, {
      title: message ?? "Downloading...",
      description: `${Math.floor(progress)}%`,
    });
    return toastId;
  }

  return toastManager.add({
    id: toastId,
    type: "loading",
    title: message ?? "Downloading...",
    description: `${Math.floor(progress)}%`,
    timeout: Infinity,
    actionProps: {
      children: "Cancel",
      onClick: () => {
        const controller = abortControllers.get(toastId);
        if (controller) {
          controller.abort();
          abortControllers.delete(toastId);
        }
        toastManager.close(toastId);
      },
    },
  });
}

export function hideProgressToast(toastId = "download-progress"): void {
  abortControllers.delete(toastId);
  toastManager.close(toastId);
}
