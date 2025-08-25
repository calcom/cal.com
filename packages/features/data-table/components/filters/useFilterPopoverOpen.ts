import { useState, useEffect, useCallback } from "react";

import { useDataTable } from "../../hooks";

export function useFilterPopoverOpen(columnId: string) {
  const { filterToOpen } = useDataTable();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (filterToOpen.current === columnId) {
      timeoutId = setTimeout(() => {
        setOpen(true);
        // Reset only if we still own the marker to avoid clobbering a newer selection.
        if (filterToOpen.current === columnId) {
          filterToOpen.current = undefined;
        }
      }, 0);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [filterToOpen, columnId]);

  const onOpenChange = useCallback(
    (open: boolean) => {
      if (filterToOpen.current === columnId && !open) {
        filterToOpen.current = undefined;
      }
      setOpen(open);
    },
    [filterToOpen, columnId]
  );

  return { open, onOpenChange };
}
