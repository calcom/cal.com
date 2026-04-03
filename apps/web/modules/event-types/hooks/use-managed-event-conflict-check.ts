import { useCallback, useRef, useState } from "react";

import type { ChildrenEventType } from "@calcom/features/eventtypes/lib/childrenEventType";
import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import { SchedulingType } from "@calcom/prisma/enums";

/**
 * Hook to detect slug conflicts when newly-added members have personal event types
 * with the same slug as the managed event type. Shows the ManagedEventDialog for
 * admin confirmation before proceeding with the save.
 */
export function useManagedEventConflictCheck({
  schedulingType,
  onSubmit,
}: {
  schedulingType: string | null;
  onSubmit: (values: FormValues) => void;
}) {
  const [conflictingChildren, setConflictingChildren] = useState<ChildrenEventType[]>([]);
  const pendingValuesRef = useRef<FormValues | null>(null);

  const handleSubmit = useCallback(
    (values: FormValues) => {
      if (schedulingType === SchedulingType.MANAGED) {
        const newChildren = values.children?.filter((child) => !child.created) ?? [];
        const slug = values.slug;
        const conflicts = newChildren.filter((child) => child.owner.eventTypeSlugs.includes(slug));
        if (conflicts.length > 0) {
          pendingValuesRef.current = values;
          setConflictingChildren(conflicts);
          return;
        }
      }
      onSubmit(values);
    },
    [schedulingType, onSubmit]
  );

  const confirm = useCallback(() => {
    const pending = pendingValuesRef.current;
    pendingValuesRef.current = null;
    setConflictingChildren([]);
    if (pending) {
      onSubmit(pending);
    }
  }, [onSubmit]);

  const cancel = useCallback(() => {
    pendingValuesRef.current = null;
    setConflictingChildren([]);
  }, []);

  return {
    handleSubmit,
    conflictDialog: {
      conflictingChildren,
      confirm,
      cancel,
    },
  };
}
