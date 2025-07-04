import {
  EventTeamAssignmentTab,
  type EventTeamAssignmentTabBaseProps,
} from "@calcom/features/eventtypes/components/tabs/assignment/EventTeamAssignmentTab";
import { MembershipRole } from "@calcom/prisma/enums";

const EventTeamAssignmentTabPlatformWrapper = (
  props: Omit<EventTeamAssignmentTabBaseProps, "isSegmentApplicable">
) => {
  // Filter team members to only include those with MEMBER role
  const filteredTeamMembers = props.teamMembers.filter(
    (member) => member.membership === MembershipRole.MEMBER
  );

  return <EventTeamAssignmentTab {...props} teamMembers={filteredTeamMembers} isSegmentApplicable={false} />;
};

export default EventTeamAssignmentTabPlatformWrapper;
