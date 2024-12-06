import { useMemo, type ComponentProps, type Dispatch, type SetStateAction } from "react";
import { useFormContext } from "react-hook-form";
import { Controller } from "react-hook-form";
import type { Options } from "react-select";

import {
  useIsPlatform,
  AddMembersWithSwitchWebWrapper,
  AddMembersWithSwitchPlatformWrapper,
} from "@calcom/atoms/monorepo";
import { Segment } from "@calcom/features/Segment";
import type {
  FormValues,
  Host,
  SettingsToggleClassNames,
  TeamMember,
} from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { AttributesQueryValue } from "@calcom/lib/raqb/types";
import { Label, SettingsToggle } from "@calcom/ui";

import AssignAllTeamMembers from "./AssignAllTeamMembers";
import CheckedTeamSelect from "./CheckedTeamSelect";
import type { CheckedSelectOption, CheckedTeamSelectCustomClassNames } from "./CheckedTeamSelect";

interface IUserToValue {
  id: number | null;
  name: string | null;
  username: string | null;
  avatar: string;
  email: string;
  defaultScheduleId: number | null;
}

export const mapUserToValue = (
  { id, name, username, avatar, email, defaultScheduleId }: IUserToValue,
  pendingString: string
) => ({
  value: `${id || ""}`,
  label: `${name || email || ""}${!username ? ` (${pendingString})` : ""}`,
  avatar,
  email,
  defaultScheduleId,
});

const sortByLabel = (a: ReturnType<typeof mapUserToValue>, b: ReturnType<typeof mapUserToValue>) => {
  if (a.label < b.label) {
    return -1;
  }
  if (a.label > b.label) {
    return 1;
  }
  return 0;
};

const CheckedHostField = ({
  labelText,
  placeholder,
  options = [],
  isFixed,
  value,
  onChange,
  helperText,
  isRRWeightsEnabled,
  customClassNames,
  ...rest
}: {
  labelText?: string;
  placeholder: string;
  isFixed: boolean;
  value: Host[];
  onChange?: (options: Host[]) => void;
  options?: Options<CheckedSelectOption>;
  helperText?: React.ReactNode | string;
  isRRWeightsEnabled?: boolean;
} & Omit<Partial<ComponentProps<typeof CheckedTeamSelect>>, "onChange" | "value">) => {
  return (
    <div className="flex flex-col rounded-md">
      <div>
        {labelText ? <Label>{labelText}</Label> : <></>}
        <CheckedTeamSelect
          isOptionDisabled={(option) => !!value.find((host) => host.userId.toString() === option.value)}
          onChange={(options) => {
            onChange &&
              onChange(
                options.map((option) => ({
                  isFixed,
                  userId: parseInt(option.value, 10),
                  priority: option.priority ?? 2,
                  weight: option.weight ?? 100,
                  scheduleId: option.defaultScheduleId,
                }))
              );
          }}
          value={(value || [])
            .filter(({ isFixed: _isFixed }) => isFixed === _isFixed)
            .reduce((acc, host) => {
              const option = options.find((member) => member.value === host.userId.toString());
              if (!option) return acc;

              acc.push({ ...option, priority: host.priority ?? 2, isFixed, weight: host.weight ?? 100 });

              return acc;
            }, [] as CheckedSelectOption[])}
          controlShouldRenderValue={false}
          options={options}
          placeholder={placeholder}
          isRRWeightsEnabled={isRRWeightsEnabled}
          customClassNames={customClassNames}
          {...rest}
        />
      </div>
    </div>
  );
};

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
          <AssignAllTeamMembers
            assignAllTeamMembers={assignAllTeamMembers}
            setAssignAllTeamMembers={setAssignAllTeamMembers}
            onActive={() => {
              onActive();
            }}
            onInactive={onAssignAllTeamMembersInactive}
            customClassNames={customClassNames?.assingAllTeamMembers}
          />
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
            {assignmentState === AssignmentState.TOGGLES_OFF_AND_ALL_TEAM_MEMBERS_APPLICABLE && (
              <AssignAllTeamMembers
                assignAllTeamMembers={assignAllTeamMembers}
                setAssignAllTeamMembers={setAssignAllTeamMembers}
                onActive={onActive}
                onInactive={onAssignAllTeamMembersInactive}
                customClassNames={customClassNames?.assingAllTeamMembers}
              />
            )}
          </div>
          <div className="mb-2">
            <CheckedHostField
              data-testid={rest["data-testid"]}
              value={value}
              onChange={onChange}
              isFixed={isFixed}
              className="mb-2"
              options={teamMembers.sort(sortByLabel)}
              placeholder={placeholder ?? t("add_attendees")}
              isRRWeightsEnabled={isRRWeightsEnabled}
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
    <div className="rounded-md ">
      <div className={`flex flex-col rounded-md pb-2 pt-6 ${containerClassName}`}>
        <AddMembersWithSwitchWrapped {...props} />
      </div>
    </div>
  );
};

export default AddMembersWithSwitchWrapper;
