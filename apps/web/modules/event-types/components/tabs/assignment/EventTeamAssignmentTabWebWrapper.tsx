import {
  EventTeamAssignmentTab,
  type EventTeamAssignmentTabBaseProps,
} from "@calcom/features/eventtypes/components/tabs/assignment/EventTeamAssignmentTab";

import AddMembersWithSwitch from "@calcom/web/modules/event-types/components/AddMembersWithSwitch";
import { EditWeightsForAllTeamMembers } from "@calcom/web/modules/event-types/components/EditWeightsForAllTeamMembers";

const EventTeamAssignmentTabWebWrapper = (
  props: Omit<EventTeamAssignmentTabBaseProps, "isSegmentApplicable">
) => {
  const isSegmentApplicable = !!props.orgId;
  return (
    <EventTeamAssignmentTab
      {...props}
      isSegmentApplicable={isSegmentApplicable}
      slots={{
        AddMembersWithSwitch: AddMembersWithSwitch,
        EditWeightsForAllTeamMembers: EditWeightsForAllTeamMembers,
      }}
    />
  );
};

export default EventTeamAssignmentTabWebWrapper;
