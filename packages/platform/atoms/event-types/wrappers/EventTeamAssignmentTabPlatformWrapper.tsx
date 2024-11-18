import {
  EventTeamAssignmentTab,
  type EventTeamAssignmentTabBaseProps,
} from "@calcom/features/eventtypes/components/tabs/assignment/EventTeamAssignmentTab";

const EventTeamAssignmentTabPlatformWrapper = (props: EventTeamAssignmentTabBaseProps) => {
  return <EventTeamAssignmentTab {...props} />;
};

export default EventTeamAssignmentTabPlatformWrapper;
