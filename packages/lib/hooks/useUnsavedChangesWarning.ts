import { useEffect } from "react";

export function useUnsavedChangesWarning(isDirty: boolean) {
  useEffect(() => {
    // Only attach the listener if there are actual unsaved changes
    if (!isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Required to trigger the dialog in legacy browsers, despite modern deprecation
      event.returnValue = ""; 
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);
}