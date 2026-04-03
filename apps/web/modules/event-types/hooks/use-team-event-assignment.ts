import { useCallback, useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import type { EventTypeSetupProps, FormValues } from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SchedulingType } from "@calcom/prisma/enums";
import { mapUserToValue } from "@calcom/web/modules/event-types/components/AddMembersWithSwitch";

import { mapMemberToChildrenOption } from "../components/tabs/assignment/EventTeamAssignmentTab";
import { useAssignAllManagedWarning } from "./use-assign-all-managed-warning";

type UseTeamEventAssignmentParams = Pick<EventTypeSetupProps, "teamMembers" | "eventType">;

export function useTeamEventAssignment({ eventType, teamMembers }: UseTeamEventAssignmentParams) {
  const { t } = useLocale();
  const { getValues, setValue, control } = useFormContext<FormValues>();
  const assignAllManagedWarning = useAssignAllManagedWarning();
  const eventTypeSlug = useWatch<FormValues>({ control, name: "slug" }) ?? eventType.slug;
  const isManagedEventType = eventType.schedulingType === SchedulingType.MANAGED;

  const pendingMembers = useCallback(
    (member: (typeof teamMembers)[number]) => !!eventType.team?.parentId || !!member.username,
    [eventType.team?.parentId]
  );

  const childrenEventTypeOptions = useMemo(
    () =>
      teamMembers.filter(pendingMembers).map((member) =>
        mapMemberToChildrenOption(
          {
            ...member,
            eventTypes: member.eventTypes.filter(
              (et) => et !== eventType.slug || !eventType.children.some((c) => c.owner.id === member.id)
            ),
          },
          eventType.slug,
          t("pending")
        )
      ),
    [teamMembers, pendingMembers, eventType.slug, eventType.children, t]
  );

  const teamMembersOptions = useMemo(
    () => teamMembers.filter(pendingMembers).map((member) => mapUserToValue(member, t("pending"))),
    [teamMembers, pendingMembers, t]
  );

  const [assignAllTeamMembers, setAssignAllTeamMembers] = useState<boolean>(
    getValues("assignAllTeamMembers") ?? false
  );

  const setChildrenToAllTeamMembers = useCallback(() => {
    setValue("children", childrenEventTypeOptions, { shouldDirty: true });
  }, [setValue, childrenEventTypeOptions]);

  const updateAssignAllTeamMembers = useCallback(
    (newValue: boolean) => {
      setValue("assignAllTeamMembers", newValue, { shouldDirty: true });
      setAssignAllTeamMembers(newValue);
    },
    [setValue]
  );

  const handleToggle = useCallback(
    (enabled: boolean) => {
      updateAssignAllTeamMembers(enabled);
      if (isManagedEventType && enabled) {
        setChildrenToAllTeamMembers();
      }
    },
    [updateAssignAllTeamMembers, isManagedEventType, setChildrenToAllTeamMembers]
  );

  const attemptSetAssignAll = useCallback(
    (newValue: boolean) => {
      if (
        assignAllManagedWarning.shouldShowWarning({
          schedulingType: eventType.schedulingType,
          oldAssignAllTeamMembers: assignAllTeamMembers,
          newAssignAllTeamMembers: newValue,
        })
      ) {
        assignAllManagedWarning.show();
        return;
      }
      handleToggle(newValue);
    },
    [assignAllTeamMembers, assignAllManagedWarning, eventType.schedulingType, handleToggle]
  );

  const confirmWarning = useCallback(() => {
    assignAllManagedWarning.confirm();
    handleToggle(true);
  }, [assignAllManagedWarning, handleToggle]);

  const resetAssignAll = useCallback(() => {
    updateAssignAllTeamMembers(false);
  }, [updateAssignAllTeamMembers]);

  return {
    assignAllTeamMembers,
    attemptSetAssignAll,
    childrenEventTypeOptions,
    teamMembersOptions,
    eventTypeSlug,
    isManagedEventType,
    resetAssignAll,
    warningDialog: {
      isOpen: assignAllManagedWarning.isOpen,
      onConfirm: confirmWarning,
      onClose: assignAllManagedWarning.cancel,
    },
  };
}
