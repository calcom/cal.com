import { Progress } from "@coss/ui/components/progress";
import { toastManager } from "@coss/ui/components/toast";

const abortControllers = new Map<string, AbortController>();
const activeToasts = new Set<string>();

interface ShowProgressToastOptions {
  progress: number;
  toastId: string;
  title: string;
  cancelLabel: string;
  abortController?: AbortController;
}

export function showProgressToast({
  progress,
  toastId,
  title,
  cancelLabel,
  abortController,
}: ShowProgressToastOptions): string {
  if (abortController) {
    abortControllers.set(toastId, abortController);
  }

  const progressValue = Math.floor(progress);

  if (activeToasts.has(toastId)) {
    toastManager.update(toastId, {
      title,
      description: <Progress value={progressValue} />,
    });
    return toastId;
  }

  activeToasts.add(toastId);

  return toastManager.add({
    id: toastId,
    type: "loading",
    title,
    description: <Progress value={progressValue} />,
    timeout: Infinity,
    actionProps: {
      children: cancelLabel,
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

export function hideProgressToast(toastId: string): void {
  abortControllers.delete(toastId);
  activeToasts.delete(toastId);
  toastManager.close(toastId);
}
