// eslint-disable-next-line @calcom/eslint/deprecated-imports-next-router
import { useEffect } from "react";

import type { EventTypeAssignedUsers } from "@calcom/features/eventtypes/lib/types";
import { checkForEmptyAssignment } from "@calcom/features/eventtypes/lib/checkForEmptyAssignment";

export const useHandleRouteChange = ({
  isTeamEventTypeDeleted,
  isleavingWithoutAssigningHosts,
  isTeamEventType,
  assignedUsers,
  hostCount,
  assignAllTeamMembers,
  isManagedEventType,
  onError,
  onStart,
  onEnd,
  watchTrigger,
}: {
  isTeamEventTypeDeleted: boolean;
  isleavingWithoutAssigningHosts: boolean;
  isTeamEventType: boolean;
  assignedUsers: EventTypeAssignedUsers;
  hostCount: number;
  assignAllTeamMembers: boolean;
  isManagedEventType: boolean;
  watchTrigger: unknown;
  onError?: (url: string) => void;
  onStart?: (handleRouteChange: (url: string) => void) => void;
  onEnd?: (handleRouteChange: (url: string) => void) => void;
}) => {
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      const paths = url.split("/");

      // If the event-type is deleted, we can't show the empty assignment warning
      if (isTeamEventTypeDeleted) return;

      if (
        !!isTeamEventType &&
        !isleavingWithoutAssigningHosts &&
        (url === "/event-types" || paths[1] !== "event-types") &&
        checkForEmptyAssignment({
          assignedUsers,
          hostCount,
          assignAllTeamMembers,
          isManagedEventType,
        })
      ) {
        onError?.(url);
      }
    };
    onStart?.(handleRouteChange);
    return () => {
      onEnd?.(handleRouteChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchTrigger, hostCount, assignedUsers, assignAllTeamMembers, onError, onStart, onEnd]);
};
