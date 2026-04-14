import type {
  EventTypeSetupProps,
  FormValues,
  SelectClassNames,
} from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/i18n/useLocale";
import { RRTimestampBasis, SchedulingType } from "@calcom/prisma/enums";
import classNames from "@calcom/ui/classNames";
import { Label, Select, SettingsToggle } from "@calcom/ui/components/form";
import { RadioAreaGroup as RadioArea } from "@calcom/ui/components/radio";
import { Tooltip } from "@calcom/ui/components/tooltip";
import AssignAllManagedWarningDialog from "@calcom/web/modules/event-types/components/dialogs/assign-all-managed-warning-dialog";
import { useTeamEventAssignment } from "@calcom/web/modules/event-types/hooks/use-team-event-assignment";
import { useCallback } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import type { ChildrenEventTypesCustomClassNames } from "./ChildrenEventTypes";
import { ChildrenEventTypes } from "./ChildrenEventTypes";
import type { HostsCustomClassNames } from "./Hosts";
import { Hosts } from "./Hosts";

export type EventTeamAssignmentTabCustomClassNames = {
  assignmentType?: {
    container?: string;
    label?: string;
    description?: string;
    schedulingTypeSelect?: SelectClassNames;
  };
  hosts?: HostsCustomClassNames;
  childrenEventTypes?: ChildrenEventTypesCustomClassNames;
};

export type EventTeamAssignmentTabBaseProps = Pick<
  EventTypeSetupProps,
  "teamMembers" | "team" | "eventType"
> & {
  customClassNames?: EventTeamAssignmentTabCustomClassNames;
  orgId: number | null;
  isSegmentApplicable: boolean;
  hideFixedHostsForCollective?: boolean;
};

export const mapMemberToChildrenOption = (
  member: EventTypeSetupProps["teamMembers"][number],
  slug: string,
  pendingString: string
) => {
  return {
    slug,
    hidden: false,
    created: false,
    owner: {
      id: member.id,
      name: member.name ?? "",
      email: member.email,
      username: member.username ?? "",
      membership: member.membership,
      eventTypeSlugs: member.eventTypes ?? [],
      avatar: member.avatar,
      profile: member.profile,
    },
    value: `${member.id ?? ""}`,
    label: `${member.name || member.email || ""}${!member.username ? ` (${pendingString})` : ""}`,
  };
};

export const EventTeamAssignmentTab = ({
  team,
  teamMembers,
  eventType,
  customClassNames,
  orgId,
  isSegmentApplicable,
  hideFixedHostsForCollective = false,
}: EventTeamAssignmentTabBaseProps) => {
  const { t } = useLocale();
  const { control, setValue } = useFormContext<FormValues>();

  const {
    assignAllTeamMembers,
    attemptSetAssignAll,
    childrenEventTypeOptions,
    teamMembersOptions,
    eventTypeSlug,
    isManagedEventType,
    resetAssignAll,
    warningDialog,
  } = useTeamEventAssignment({ eventType, teamMembers });

  const schedulingTypeOptions: {
    value: SchedulingType;
    label: string;
  }[] = [
    {
      value: "COLLECTIVE",
      label: t("collective"),
    },
    {
      value: "ROUND_ROBIN",
      label: t("round_robin"),
    },
  ];

  const handleSchedulingTypeChange = useCallback(
    (schedulingType: SchedulingType | undefined, onChange: (value: SchedulingType | undefined) => void) => {
      if (schedulingType) {
        onChange(schedulingType);
        setValue("assignRRMembersUsingSegment", false, { shouldDirty: true });
        resetAssignAll();
      }
    },
    [resetAssignAll, setValue]
  );

  const handleMaxLeadThresholdChange = (val: string, onChange: (value: number | null) => void) => {
    if (val === "loadBalancing") {
      onChange(3);
    } else {
      onChange(null);
    }
  };

  const schedulingType = useWatch({
    control,
    name: "schedulingType",
  });

  const hostGroups = useWatch({
    control,
    name: "hostGroups",
  });

  return (
    <div>
      {team && !isManagedEventType && (
        <>
          <div
            className={classNames(
              "border-subtle flex flex-col rounded-md",
              customClassNames?.assignmentType?.container
            )}>
            <div className="border-subtle rounded-t-md border p-6 pb-5">
              <Label
                className={classNames("mb-1 text-sm font-semibold", customClassNames?.assignmentType?.label)}>
                {t("assignment")}
              </Label>
              <p
                className={classNames(
                  "text-subtle wrap-break-word max-w-full text-sm leading-tight",
                  customClassNames?.assignmentType?.description
                )}>
                {t("assignment_description")}
              </p>
            </div>
            <div
              className={classNames(
                "border-subtle rounded-b-md border border-t-0 p-6",
                customClassNames?.assignmentType?.schedulingTypeSelect?.container
              )}>
              <Label className={customClassNames?.assignmentType?.schedulingTypeSelect?.label}>
                {t("scheduling_type")}
              </Label>
              <Controller<FormValues>
                name="schedulingType"
                render={({ field: { value, onChange } }) => (
                  <Select
                    options={schedulingTypeOptions}
                    value={schedulingTypeOptions.find((opt) => opt.value === value)}
                    className={classNames(
                      "w-full",
                      customClassNames?.assignmentType?.schedulingTypeSelect?.select
                    )}
                    innerClassNames={customClassNames?.assignmentType?.schedulingTypeSelect?.innerClassNames}
                    onChange={(val) => handleSchedulingTypeChange(val?.value, onChange)}
                  />
                )}
              />
            </div>
          </div>
          {schedulingType === "ROUND_ROBIN" && (
            <div className="border-subtle mt-4 flex flex-col rounded-md">
              <div className="border-subtle rounded-t-md border p-6 pb-5">
                <Label className="mb-1 text-sm font-semibold">{t("rr_distribution_method")}</Label>
                <p className="text-subtle wrap-break-word max-w-full text-sm leading-tight">
                  {t("rr_distribution_method_description")}
                </p>
              </div>
              <div className="border-subtle rounded-b-md border border-t-0 p-6">
                <Controller
                  name="maxLeadThreshold"
                  render={({ field: { value, onChange } }) => (
                    <RadioArea.Group
                      onValueChange={(val) => handleMaxLeadThresholdChange(val, onChange)}
                      className="mt-1 flex flex-col gap-4">
                      <RadioArea.Item
                        value="maximizeAvailability"
                        checked={value === null}
                        className="w-full text-sm"
                        classNames={{ container: "w-full" }}>
                        <strong className="mb-1 block">
                          {t("rr_distribution_method_availability_title")}
                        </strong>
                        <p>{t("rr_distribution_method_availability_description")}</p>
                      </RadioArea.Item>
                      {(eventType.team?.rrTimestampBasis &&
                        eventType.team?.rrTimestampBasis !== RRTimestampBasis.CREATED_AT) ||
                      hostGroups?.length > 1 ? (
                        <Tooltip
                          content={
                            eventType.team?.rrTimestampBasis &&
                            eventType.team?.rrTimestampBasis !== RRTimestampBasis.CREATED_AT
                              ? t("rr_load_balancing_disabled")
                              : t("rr_load_balancing_disabled_with_groups")
                          }>
                          <div className="w-full">
                            <RadioArea.Item
                              value="loadBalancing"
                              checked={value !== null}
                              className="text-sm"
                              disabled={true}
                              classNames={{ container: "w-full" }}>
                              <strong className="mb-1">{t("rr_distribution_method_balanced_title")}</strong>
                              <p>{t("rr_distribution_method_balanced_description")}</p>
                            </RadioArea.Item>
                          </div>
                        </Tooltip>
                      ) : (
                        <div className="w-full">
                          <RadioArea.Item
                            value="loadBalancing"
                            checked={value !== null}
                            className="text-sm"
                            classNames={{ container: "w-full" }}>
                            <strong className="mb-1">{t("rr_distribution_method_balanced_title")}</strong>
                            <p>{t("rr_distribution_method_balanced_description")}</p>
                          </RadioArea.Item>
                        </div>
                      )}
                    </RadioArea.Group>
                  )}
                />
                <div className="mt-4">
                  <Controller
                    name="includeNoShowInRRCalculation"
                    render={({ field: { value, onChange } }) => (
                      <SettingsToggle
                        title={t("include_no_show_in_rr_calculation")}
                        labelClassName="mt-1.5"
                        checked={value}
                        onCheckedChange={(val) => onChange(val)}
                      />
                    )}
                  />
                </div>
              </div>
            </div>
          )}
          <Hosts
            orgId={orgId}
            isSegmentApplicable={isSegmentApplicable}
            teamId={team.id}
            assignAllTeamMembers={assignAllTeamMembers}
            setAssignAllTeamMembers={attemptSetAssignAll}
            teamMembers={teamMembersOptions}
            customClassNames={customClassNames?.hosts}
            hideFixedHostsForCollective={hideFixedHostsForCollective}
          />
        </>
      )}
      {team && isManagedEventType && (
        <>
          <ChildrenEventTypes
            assignAllTeamMembers={assignAllTeamMembers}
            setAssignAllTeamMembers={attemptSetAssignAll}
            childrenEventTypeOptions={childrenEventTypeOptions}
            customClassNames={customClassNames?.childrenEventTypes}
          />
          <AssignAllManagedWarningDialog
            isOpen={warningDialog.isOpen}
            eventTypeSlug={eventTypeSlug}
            onConfirm={warningDialog.onConfirm}
            onClose={warningDialog.onClose}
          />
        </>
      )}
    </div>
  );
};
