import {
  EventTeamAssignmentTab,
  type EventTeamAssignmentTabBaseProps,
} from "@calcom/web/modules/event-types/components/tabs/assignment/EventTeamAssignmentTab";

const EventTeamAssignmentTabWebWrapper = (
  props: Omit<EventTeamAssignmentTabBaseProps, "isSegmentApplicable">
) => {
  const isSegmentApplicable = !!props.orgId;
  return <EventTeamAssignmentTab {...props} isSegmentApplicable={isSegmentApplicable} />;
};

export default EventTeamAssignmentTabWebWrapper;
