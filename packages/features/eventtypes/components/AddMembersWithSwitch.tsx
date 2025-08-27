import { useMemo, type Dispatch, type SetStateAction } from "react";
import { useFormContext } from "react-hook-form";
import { Controller } from "react-hook-form";

import { AssignAllTeamMembers } from "@calcom/atoms/add-members-switch";
import { AddMembersWithSwitchPlatformWrapper } from "@calcom/atoms/add-members-switch/AddMembersWithSwitchPlatformWrapper";
import { AddMembersWithSwitchWebWrapper } from "@calcom/atoms/add-members-switch/AddMembersWithSwitchWebWrapper";
import SettingsToggle from "@calcom/atoms/add-members-switch/SettingsToggle";
import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";
import { Segment } from "@calcom/features/Segment";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import type {
  FormValues,
  SettingsToggleClassNames,
  TeamMember,
  Host,
  AttributesQueryValue,
} from "../lib/types";
import CheckedHostField from "./CheckedHostField";
import type { CheckedTeamSelectCustomClassNames } from "./CheckedTeamSelect";

// Helper function to sort by label
const sortByLabel = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label);

// Helper function to map user to value
export const mapUserToValue = (user: { id: number; name?: string | null; email: string }) => ({
  value: user.id.toString(),
  label: user.name || user.email,
  avatar: "",
});

function MembersSegmentWithToggle({
  teamId,
  assignRRMembersUsingSegment,
  setAssignRRMembersUsingSegment,
  rrSegmentQueryValue,
  setRrSegmentQueryValue,
  className,
}: {
  teamId: number;
  assignRRMembersUsingSegment: boolean;
  setAssignRRMembersUsingSegment: (value: boolean) => void;
  rrSegmentQueryValue: AttributesQueryValue | null;
  setRrSegmentQueryValue: (value: AttributesQueryValue) => void;
  className?: string;
}) {
  const { t } = useLocale();
  const onQueryValueChange = ({ queryValue }: { queryValue: AttributesQueryValue }) => {
    setRrSegmentQueryValue(queryValue);
  };
  const isPlatform = useIsPlatform();
  return (
    <Controller<FormValues>
      name="assignRRMembersUsingSegment"
      render={() => (
        <SettingsToggle
          noIndentation
          data-testid="segment-toggle"
          title={t("filter_by_attributes")}
          labelClassName="mt-0.5 font-normal"
          checked={assignRRMembersUsingSegment}
          onCheckedChange={(active) => {
            setAssignRRMembersUsingSegment(active);
          }}>
          {!isPlatform && (
            <Segment
              teamId={teamId}
              queryValue={rrSegmentQueryValue}
              onQueryValueChange={onQueryValueChange}
              className={className}
            />
          )}
        </SettingsToggle>
      )}
    />
  );
}

export type AddMembersWithSwitchCustomClassNames = {
  assingAllTeamMembers?: SettingsToggleClassNames;
  teamMemberSelect?: CheckedTeamSelectCustomClassNames;
};

export type AddMembersWithSwitchProps = {
  teamMembers: TeamMember[];
  value: Host[];
  onChange: (hosts: Host[]) => void;
  assignAllTeamMembers: boolean;
  setAssignAllTeamMembers: Dispatch<SetStateAction<boolean>>;
  automaticAddAllEnabled: boolean;
  onActive: () => void;
  isFixed: boolean;
  placeholder?: string;
  isRRWeightsEnabled?: boolean;
  teamId: number;
  isSegmentApplicable?: boolean;
  groupId: string | null;
  "data-testid"?: string;
  customClassNames?: AddMembersWithSwitchCustomClassNames;
};

const enum AssignmentState {
  TOGGLES_OFF_AND_ALL_TEAM_MEMBERS_NOT_APPLICABLE = "TOGGLES_OFF_AND_ALL_TEAM_MEMBERS_NOT_APPLICABLE",
  TOGGLES_OFF_AND_ALL_TEAM_MEMBERS_APPLICABLE = "TOGGLES_OFF_AND_ALL_TEAM_MEMBERS_APPLICABLE",
  ALL_TEAM_MEMBERS_ENABLED_AND_SEGMENT_APPLICABLE = "ALL_TEAM_MEMBERS_ENABLED_AND_SEGMENT_APPLICABLE",
  ALL_TEAM_MEMBERS_ENABLED_AND_SEGMENT_NOT_APPLICABLE = "ALL_TEAM_MEMBERS_ENABLED_AND_SEGMENT_NOT_APPLICABLE",
  TEAM_MEMBERS_IN_SEGMENT_ENABLED = "TEAM_MEMBERS_IN_SEGMENT_ENABLED",
}

function getAssignmentState({
  assignAllTeamMembers,
  assignRRMembersUsingSegment,
  isAssigningAllTeamMembersApplicable,
  isSegmentApplicable,
}: {
  assignAllTeamMembers: boolean;
  assignRRMembersUsingSegment: boolean;
  isAssigningAllTeamMembersApplicable: boolean;
  isSegmentApplicable?: boolean;
}) {
  if (assignAllTeamMembers) {
    return isSegmentApplicable
      ? AssignmentState.ALL_TEAM_MEMBERS_ENABLED_AND_SEGMENT_APPLICABLE
      : AssignmentState.ALL_TEAM_MEMBERS_ENABLED_AND_SEGMENT_NOT_APPLICABLE;
  }
  if (assignRRMembersUsingSegment && isSegmentApplicable)
    return AssignmentState.TEAM_MEMBERS_IN_SEGMENT_ENABLED;
  if (isAssigningAllTeamMembersApplicable) return AssignmentState.TOGGLES_OFF_AND_ALL_TEAM_MEMBERS_APPLICABLE;
  return AssignmentState.TOGGLES_OFF_AND_ALL_TEAM_MEMBERS_NOT_APPLICABLE;
}

function useSegmentState() {
  const { getValues, setValue, watch } = useFormContext<FormValues>();
  const assignRRMembersUsingSegment = watch("assignRRMembersUsingSegment");

  const setAssignRRMembersUsingSegment = (value: boolean) =>
    setValue("assignRRMembersUsingSegment", value, { shouldDirty: true });

  const rrSegmentQueryValue = getValues("rrSegmentQueryValue");
  const setRrSegmentQueryValue = (value: AttributesQueryValue) =>
    setValue("rrSegmentQueryValue", value, { shouldDirty: true });

  return {
    assignRRMembersUsingSegment,
    setAssignRRMembersUsingSegment,
    rrSegmentQueryValue,
    setRrSegmentQueryValue,
  };
}

export function AddMembersWithSwitch({
  teamMembers,
  value,
  onChange,
  assignAllTeamMembers,
  setAssignAllTeamMembers,
  automaticAddAllEnabled,
  onActive,
  isFixed,
  placeholder = "",
  isRRWeightsEnabled,
  teamId,
  isSegmentApplicable,
  groupId,
  customClassNames,
  ...rest
}: AddMembersWithSwitchProps) {
  const { t } = useLocale();
  const { setValue } = useFormContext<FormValues>();
  const {
    assignRRMembersUsingSegment,
    setAssignRRMembersUsingSegment,
    rrSegmentQueryValue,
    setRrSegmentQueryValue,
  } = useSegmentState();

  const assignmentState = getAssignmentState({
    assignAllTeamMembers,
    assignRRMembersUsingSegment,
    isAssigningAllTeamMembersApplicable: automaticAddAllEnabled,
    isSegmentApplicable,
  });

  const onAssignAllTeamMembersInactive = () => {
    setAssignRRMembersUsingSegment(false);
  };

  switch (assignmentState) {
    case AssignmentState.ALL_TEAM_MEMBERS_ENABLED_AND_SEGMENT_APPLICABLE:
    case AssignmentState.ALL_TEAM_MEMBERS_ENABLED_AND_SEGMENT_NOT_APPLICABLE:
    case AssignmentState.TEAM_MEMBERS_IN_SEGMENT_ENABLED:
      return (
        <>
          {!groupId && (
            <AssignAllTeamMembers
              onAssignAll={() => setAssignAllTeamMembers(true)}
              disabled={assignAllTeamMembers}
            />
          )}

          {assignmentState !== AssignmentState.ALL_TEAM_MEMBERS_ENABLED_AND_SEGMENT_NOT_APPLICABLE && (
            <div className="mt-2">
              <MembersSegmentWithToggle
                teamId={teamId}
                assignRRMembersUsingSegment={assignRRMembersUsingSegment}
                setAssignRRMembersUsingSegment={setAssignRRMembersUsingSegment}
                rrSegmentQueryValue={rrSegmentQueryValue}
                setRrSegmentQueryValue={setRrSegmentQueryValue}
              />
            </div>
          )}
        </>
      );

    case AssignmentState.TOGGLES_OFF_AND_ALL_TEAM_MEMBERS_NOT_APPLICABLE:
    case AssignmentState.TOGGLES_OFF_AND_ALL_TEAM_MEMBERS_APPLICABLE:
      return (
        <>
          <div className="mb-2">
            {assignmentState === AssignmentState.TOGGLES_OFF_AND_ALL_TEAM_MEMBERS_APPLICABLE && !groupId && (
              <AssignAllTeamMembers
                onAssignAll={() => setAssignAllTeamMembers(true)}
                disabled={assignAllTeamMembers}
              />
            )}
          </div>
          <div className="mb-2">
            <CheckedHostField
              data-testid={rest["data-testid"]}
              value={value.map((host) => ({
                value: host.userId?.toString() ?? host.email ?? "",
                label: host.email ?? host.userId?.toString() ?? "",
                avatar: "",
                priority: host.priority ?? null,
                weight: host.weight ?? null,
                isFixed: host.isFixed ?? false,
                groupId: host.groupId ?? null,
              }))}
              onChange={(options) => {
                onChange(
                  options.map((option) => ({
                    userId: parseInt(option.value) || undefined,
                    email: option.label,
                    isFixed: option.isFixed ?? false,
                    priority: option.priority ?? undefined,
                    weight: option.weight ?? undefined,
                    groupId: option.groupId ?? null,
                  }))
                );
              }}
              isFixed={isFixed}
              className="mb-2"
              options={teamMembers
                .map((member) => ({
                  ...member,
                  groupId: groupId,
                }))
                .sort(sortByLabel)}
              placeholder={placeholder ?? t("add_attendees")}
              isRRWeightsEnabled={isRRWeightsEnabled}
              groupId={groupId}
              customClassNames={customClassNames?.teamMemberSelect}
            />
          </div>
        </>
      );
  }
}

const AddMembersWithSwitchWrapper = ({
  containerClassName,
  ...props
}: AddMembersWithSwitchProps & {
  containerClassName?: string;
}) => {
  const isPlatform = useIsPlatform();
  const AddMembersWithSwitchWrapped = useMemo(
    () => (isPlatform ? AddMembersWithSwitchPlatformWrapper : AddMembersWithSwitchWebWrapper),
    [isPlatform]
  );
  return (
    <div className="rounded-md">
      <div className={`flex flex-col rounded-md pb-2 pt-6 ${containerClassName}`}>
        <AddMembersWithSwitchWrapped {...props} />
      </div>
    </div>
  );
};

export default AddMembersWithSwitchWrapper;
