import { useState, useEffect, useCallback } from "react";

import { useDataTable } from "../../hooks";

export function useFilterPopoverOpen(columnId: string) {
  const { filterToOpen } = useDataTable();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (filterToOpen.current === columnId) {
      setTimeout(() => {
        setOpen(true);
      }, 0);
    }
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
