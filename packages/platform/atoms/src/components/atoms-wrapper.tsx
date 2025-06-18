import type { ReactNode } from "react";
import { useEffect, createContext, useContext, useState } from "react";

import classNames from "@calcom/ui/classNames";

import { useAtomsContext } from "../../hooks/useAtomsContext";
import http from "../../lib/http";
import { CALCOM_ATOMS_WRAPPER_CLASS } from "../constants/styles";
import { useToast } from "./ui/use-toast";

// Context for managing global toast settings
interface ToastContextType {
  disableToasts: boolean;
  setDisableToasts: (disabled: boolean) => void;
}

const ToastContext = createContext<ToastContextType>({
  disableToasts: false,
  setDisableToasts: () => undefined,
});

export const useToastContext = () => useContext(ToastContext);

export const AtomsWrapper = ({
  children,
  customClassName,
  disableToasts = false,
}: {
  children: ReactNode;
  customClassName?: string;
  disableToasts?: boolean;
}) => {
  const { options } = useAtomsContext();
  const { toast } = useToast();
  const [globalDisableToasts, setGlobalDisableToasts] = useState(disableToasts);

  // Set up global error handler
  useEffect(() => {
    const showToast = (message: string, _variant: "success" | "warning" | "error") => {
      if (!globalDisableToasts) {
        toast({ description: message });
      }
    };

    // Set the global toast function for http interceptor
    http.setGlobalToastFunction(showToast);
    http.setGlobalDisableToasts(globalDisableToasts);

    // remove global toast function when component unmounts
    return () => {
      http.setGlobalToastFunction(null);
      http.setGlobalDisableToasts(false);
    };
  }, [toast, globalDisableToasts]);

  // Update global setting when prop changes
  useEffect(() => {
    setGlobalDisableToasts(disableToasts);
    http.setGlobalDisableToasts(disableToasts);
  }, [disableToasts]);

  return (
    <ToastContext.Provider
      value={{
        disableToasts: globalDisableToasts,
        setDisableToasts: setGlobalDisableToasts,
      }}>
      <div
        dir={options?.readingDirection ?? "ltr"}
        className={classNames(
          `${CALCOM_ATOMS_WRAPPER_CLASS} m-0 w-auto bg-transparent p-0`,
          customClassName
        )}>
        {children}
      </div>
    </ToastContext.Provider>
  );
};
