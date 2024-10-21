import {
  EventTeamAssignmentTab,
  type EventTeamAssignmentTabBaseProps,
} from "@calcom/features/eventtypes/components/tabs/assignment/EventTeamAssignmentTab";

const EventTeamAssignmentTabWebWrapper = (props: EventTeamAssignmentTabBaseProps) => {
  return <EventTeamAssignmentTab {...props} />;
};

export default EventTeamAssignmentTabWebWrapper;
