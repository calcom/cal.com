import { useEffect } from "react";

/**
 * Registers a `beforeunload` event listener that shows the browser's built-in
 * "Leave page?" dialog when `isDirty` is true.
 *
 * Call this inside any settings form component that tracks unsaved changes so
 * users are warned before accidentally navigating away and losing their edits.
 */
export function useBeforeUnload(isDirty: boolean) {
    useEffect(() => {
        if (!isDirty) return;

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            // Required for some older browsers to display the dialog.
            // Modern browsers ignore the return value and show a generic message.
            event.returnValue = "";
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [isDirty]);
}
