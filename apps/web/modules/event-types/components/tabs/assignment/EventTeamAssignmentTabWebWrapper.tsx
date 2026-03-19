import { EventTeamAssignmentTab, type EventTeamAssignmentTabBaseProps } from "./EventTeamAssignmentTab";

const EventTeamAssignmentTabWebWrapper = (
  props: Omit<EventTeamAssignmentTabBaseProps, "isSegmentApplicable">
) => {
  const isSegmentApplicable = !!props.orgId;
  return <EventTeamAssignmentTab {...props} isSegmentApplicable={isSegmentApplicable} />;
};

export default EventTeamAssignmentTabWebWrapper;
