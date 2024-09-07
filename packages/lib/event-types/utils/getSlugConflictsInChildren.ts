import type { EventTypeSetupProps, FormValues } from "@calcom/features/eventtypes/lib/types";

export const getSlugConflictsInChildren = ({
  values,
  eventType,
}: {
  values: FormValues;
  eventType: EventTypeSetupProps["eventType"];
}) => {
  const conflicts = values.children.filter((child) => {
    const isNewAssignment = !eventType.children.some((c) => c.owner.id === child.owner.id);
    const isSlugPresentInChild = child.owner.eventTypeSlugs.includes(values.slug);
    const isEventTypeSlugChanged = eventType.slug !== values.slug;

    const isNewAssignmentWithConflict = isNewAssignment && isSlugPresentInChild;
    const isExistingAssignmentWithConflict =
      !isNewAssignment && isEventTypeSlugChanged && isSlugPresentInChild;
    return isNewAssignmentWithConflict || isExistingAssignmentWithConflict;
  });

  return conflicts;
};
