import {
  EventTeamAssignmentTab,
  type EventTeamAssignmentTabBaseProps,
} from "@calcom/features/eventtypes/components/tabs/assignment/EventTeamAssignmentTab";

const EventTeamAssignmentTabPlatformWrapper = (
  props: Omit<
    EventTeamAssignmentTabBaseProps,
    "isSegmentApplicable" | "hideFixedHostsForCollective"
  >
) => {
  // todo: implement attributes for platform orgs for segment
  return (
    <EventTeamAssignmentTab
      {...props}
      isSegmentApplicable={false}
      hideFixedHostsForCollective={true}
      slots={{
        AddMembersWithSwitch: null,
        EditWeightsForAllTeamMembers: null,
      }}
    />
  );
};

export default EventTeamAssignmentTabPlatformWrapper;
