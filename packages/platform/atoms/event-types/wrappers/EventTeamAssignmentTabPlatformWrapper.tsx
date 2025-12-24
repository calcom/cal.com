import {
  EventTeamAssignmentTab,
  type EventTeamAssignmentTabBaseProps,
} from "@calcom/web/modules/event-types/components/tabs/assignment/EventTeamAssignmentTab";

const EventTeamAssignmentTabPlatformWrapper = (
  props: Omit<EventTeamAssignmentTabBaseProps, "isSegmentApplicable">
) => {
  // todo: implement attributes for platform orgs for segment
  return <EventTeamAssignmentTab {...props} isSegmentApplicable={false} />;
};

export default EventTeamAssignmentTabPlatformWrapper;
