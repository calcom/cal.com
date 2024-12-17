import {
  EventTeamAssignmentTab,
  type EventTeamAssignmentTabBaseProps,
} from "@calcom/features/eventtypes/components/tabs/assignment/EventTeamAssignmentTab";

const EventTeamAssignmentTabWebWrapper = (
  props: Omit<EventTeamAssignmentTabBaseProps, "isSegmentApplicable">
) => {
  const isSegmentApplicable = !!props.orgId;
  return <EventTeamAssignmentTab {...props} isSegmentApplicable={isSegmentApplicable} />;
};

export default EventTeamAssignmentTabWebWrapper;
