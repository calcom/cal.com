import { AtomsWrapper } from "../atoms-wrapper";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "./toast";
import { useToast } from "./use-toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <AtomsWrapper>
      <ToastProvider>
        {toasts.map(({ id, title, description, action, ...props }) => (
          <AtomsWrapper key={id}>
            <Toast {...props}>
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && <ToastDescription>{description}</ToastDescription>}
              </div>
              {action}
              <ToastClose />
            </Toast>
          </AtomsWrapper>
        ))}
        <ToastViewport />
      </ToastProvider>
    </AtomsWrapper>
  );
}
