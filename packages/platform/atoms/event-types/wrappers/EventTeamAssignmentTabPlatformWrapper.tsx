import {
  EventTeamAssignmentTab,
  type EventTeamAssignmentTabBaseProps,
} from "@calcom/features/eventtypes/components/tabs/assignment/EventTeamAssignmentTab";

const EventTeamAssignmentTabPlatformWrapper = (
  props: Omit<EventTeamAssignmentTabBaseProps, "isSegmentApplicable">
) => {
  // todo: implement attributes for platform orgs for segment
  return <EventTeamAssignmentTab {...props} isSegmentApplicable={false} />;
};

export default EventTeamAssignmentTabPlatformWrapper;
