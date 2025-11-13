import { useEffect, useRef } from "react";
import type { UseFormReturn } from "react-hook-form";

import type { RoutingFormWithResponseCount } from "@calcom/app-store/routing-forms/types/types";

const SESSION_STORAGE_KEY_PREFIX = "routing-form-draft-";

export function useRoutingFormSessionStorage(
  formId: string,
  hookForm: UseFormReturn<RoutingFormWithResponseCount>,
  serverForm: RoutingFormWithResponseCount
) {
  const storageKey = `${SESSION_STORAGE_KEY_PREFIX}${formId}`;
  const isInitialized = useRef(false);
  const lastSavedFormId = useRef<string | null>(null);

  useEffect(() => {
    if (lastSavedFormId.current !== null && lastSavedFormId.current !== formId) {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(`${SESSION_STORAGE_KEY_PREFIX}${lastSavedFormId.current}`);
      }
      isInitialized.current = false;
    }

    lastSavedFormId.current = formId;

    if (!isInitialized.current && typeof window !== "undefined") {
      try {
        const savedState = sessionStorage.getItem(storageKey);
        if (savedState) {
          const parsedState = JSON.parse(savedState) as RoutingFormWithResponseCount;
          if (parsedState.id === formId) {
            hookForm.reset(parsedState, { keepDefaultValues: false });
            isInitialized.current = true;
            return;
          }
        }
      } catch (error) {
        console.error("Failed to load routing form state from sessionStorage:", error);
      }

      hookForm.reset(serverForm, { keepDefaultValues: false });
      isInitialized.current = true;
    }
  }, [formId, hookForm, serverForm, storageKey]);

  useEffect(() => {
    if (!isInitialized.current) {
      return;
    }

    const subscription = hookForm.watch((formData) => {
      if (typeof window !== "undefined" && formData.id === formId) {
        try {
          sessionStorage.setItem(storageKey, JSON.stringify(formData));
        } catch (error) {
          console.error("Failed to save routing form state to sessionStorage:", error);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [hookForm, formId, storageKey]);

  const clearSessionStorage = () => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(storageKey);
      } catch (error) {
        console.error("Failed to clear routing form state from sessionStorage:", error);
      }
    }
  };

  return {
    clearSessionStorage,
  };
}
