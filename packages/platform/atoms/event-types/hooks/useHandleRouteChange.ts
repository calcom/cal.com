// eslint-disable-next-line @calcom/eslint/deprecated-imports-next-router
import { useEffect } from "react";

import type {
  EventTypeAssignedUsers,
  EventTypeHosts,
} from "@calcom/features/eventtypes/components/EventType";
import { checkForEmptyAssignment } from "@calcom/lib/event-types/utils/checkForEmptyAssignment";

export const useHandleRouteChange = ({
  isTeamEventTypeDeleted,
  isleavingWithoutAssigningHosts,
  isTeamEventType,
  assignedUsers,
  hosts,
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
  hosts: EventTypeHosts;
  assignAllTeamMembers: boolean;
  isManagedEventType: boolean;
  watchTrigger: unknown;
  onError?: (url: string) => void;
  onStart?: (handleRouteChange: (url: string) => void) => void;
  onEnd?: (handleRouteChange: (url: string) => void) => void;
}) => {
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      console.log("URL", url);
      const paths = url.split("/");

      // If the event-type is deleted, we can't show the empty assignment warning
      if (isTeamEventTypeDeleted) return;

      if (
        !!isTeamEventType &&
        !isleavingWithoutAssigningHosts &&
        (url === "/event-types" || paths[1] !== "event-types") &&
        checkForEmptyAssignment({
          assignedUsers,
          hosts,
          assignAllTeamMembers,
          isManagedEventType,
        })
      ) {
        onError?.(url);
        //setIsOpenAssignmentWarnDialog(true);
        //setPendingRoute(url);
        /* router.events.emit(
          "routeChangeError",
          new Error(`Aborted route change to ${url} because none was assigned to team event`)
        );
        throw "Aborted"; */
      }
    };
    onStart?.(handleRouteChange);
    //router.events.on("routeChangeStart", handleRouteChange);
    return () => {
      //router.events.off("routeChangeStart", handleRouteChange);
      onEnd?.(handleRouteChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchTrigger, hosts, assignedUsers, assignAllTeamMembers, onError, onStart, onEnd]);
};
