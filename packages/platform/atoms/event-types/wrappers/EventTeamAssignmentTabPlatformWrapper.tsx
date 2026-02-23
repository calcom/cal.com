import {
  EventTeamAssignmentTab,
  type EventTeamAssignmentTabBaseProps,
// biome-ignore lint/style/noRestrictedImports: pre-existing violation
} from "@calcom/web/modules/event-types/components/tabs/assignment/EventTeamAssignmentTab";

const EventTeamAssignmentTabPlatformWrapper = (
  props: Omit<EventTeamAssignmentTabBaseProps, "isSegmentApplicable" | "hideFixedHostsForCollective">
) => {
  // todo: implement attributes for platform orgs for segment
  return <EventTeamAssignmentTab {...props} isSegmentApplicable={false} hideFixedHostsForCollective={true} />;
};

export default EventTeamAssignmentTabPlatformWrapper;
