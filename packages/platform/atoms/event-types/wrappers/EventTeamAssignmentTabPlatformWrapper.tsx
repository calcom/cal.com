import {
  EventTeamAssignmentTab,
  type EventTeamAssignmentTabBaseProps,
} from "@calcom/web/modules/event-types/components/tabs/assignment/EventTeamAssignmentTab";

const EventTeamAssignmentTabPlatformWrapper = (
  props: Omit<EventTeamAssignmentTabBaseProps, "isSegmentApplicable" | "hideFixedHostsForCollective">
) => {
  // todo: implement attributes for platform orgs for segment
  return <EventTeamAssignmentTab {...props} isSegmentApplicable={false} hideFixedHostsForCollective={true} />;
};

export default EventTeamAssignmentTabPlatformWrapper;
