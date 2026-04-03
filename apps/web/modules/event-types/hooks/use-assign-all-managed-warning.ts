import { useCallback, useRef, useState } from "react";

import { SchedulingType } from "@calcom/prisma/enums";

/**
 * Hook to manage the "Assign all team members" warning dialog for managed event types.
 * Shows a warning when the assignAllTeamMembers toggle is switched from OFF to ON,
 * so the user can immediately correlate the action with the warning.
 *
 * - confirm(): keeps the toggle ON, dialog closes
 * - cancel(): returns true to signal the caller should revert the toggle to OFF
 */
export function useAssignAllManagedWarning() {
  const [isOpen, setIsOpen] = useState(false);
  const hasConfirmedEarlierRef = useRef(false);

  const shouldShowWarning = useCallback(
    ({
      schedulingType,
      oldAssignAllTeamMembers,
      newAssignAllTeamMembers,
    }: {
      schedulingType: string | null;
      oldAssignAllTeamMembers: boolean;
      newAssignAllTeamMembers: boolean;
    }) => {
      const hasConfirmedEarlier = hasConfirmedEarlierRef.current;
      return (
        newAssignAllTeamMembers &&
        !oldAssignAllTeamMembers &&
        schedulingType === SchedulingType.MANAGED &&
        !hasConfirmedEarlier
      );
    },
    []
  );

  const show = useCallback(() => {
    setIsOpen(true);
  }, []);

  const confirm = useCallback(() => {
    hasConfirmedEarlierRef.current = true;
    setIsOpen(false);
  }, []);

  const cancel = useCallback(() => {
    setIsOpen(false);
  }, []);

  return { isOpen, shouldShowWarning, show, confirm, cancel };
}
