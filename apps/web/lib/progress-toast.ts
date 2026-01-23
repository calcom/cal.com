import { toastManager } from "@coss/ui/components/toast";

const abortControllers = new Map<string, AbortController>();
const activeToasts = new Set<string>();

export function showProgressToast(
  progress: number,
  message?: string,
  toastId = "download-progress",
  abortController?: AbortController
): string {
  if (abortController) {
    abortControllers.set(toastId, abortController);
  }

  if (activeToasts.has(toastId)) {
    toastManager.update(toastId, {
      title: message ?? "Downloading...",
      description: `${Math.floor(progress)}%`,
    });
    return toastId;
  }

  activeToasts.add(toastId);

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
        activeToasts.delete(toastId);
        toastManager.close(toastId);
      },
    },
  });
}

export function hideProgressToast(toastId = "download-progress"): void {
  abortControllers.delete(toastId);
  activeToasts.delete(toastId);
  toastManager.close(toastId);
}
