import type { ComponentProps, Dispatch, SetStateAction } from "react";
import { useFormContext } from "react-hook-form";
import type { Options } from "react-select";

import type { FormValues, Host, TeamMember } from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc, type RouterOutputs } from "@calcom/trpc";
import { Label } from "@calcom/ui";

import { Attributes, ToggleableSegment } from "../../../../apps/web/components/Segment";
import AssignAllTeamMembers from "./AssignAllTeamMembers";
import CheckedTeamSelect from "./CheckedTeamSelect";
import type { CheckedSelectOption } from "./CheckedTeamSelect";

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
                  weightAdjustment: option.weightAdjustment ?? 0,
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
          {...rest}
        />
      </div>
    </div>
  );
};

function SegmentWithToggle({
  teamId,
  assignTeamMembersInSegment,
  setAssignTeamMembersInSegment,
  className,
}: {
  teamId: number;
  assignTeamMembersInSegment: boolean;
  setAssignTeamMembersInSegment: Dispatch<SetStateAction<boolean>>;
  className?: string;
}) {
  const { t } = useLocale();
  const { setValue, getValues } = useFormContext<FormValues>();
  const queryValue = getValues("membersAssignmentSegmentQueryValue");
  const onQueryValueChange = ({ queryValue }: { queryValue: AttributesQueryValue }) => {
    setValue("membersAssignmentSegmentQueryValue", queryValue, { shouldDirty: true });
  };

  return (
    <ToggleableSegment
      teamId={teamId}
      enabled={assignTeamMembersInSegment}
      queryValue={queryValue}
      onQueryValueChange={onQueryValueChange}
      onToggle={(active) => {
        setValue("assignTeamMembersInSegment", active, { shouldDirty: true });
        setValue("assignAllTeamMembers", false, { shouldDirty: true });
        setAssignTeamMembersInSegment(active);
      }}
      onChangeOfSegment={() => {
        setValue("assignTeamMembersInSegment", false, { shouldDirty: true });
      }}
      className={className}
    />
  );
}

type AddMembersWithSwitchProps = {
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
  assignTeamMembersInSegment: boolean;
  setAssignTeamMembersInSegment: Dispatch<SetStateAction<boolean>>;
};

const enum AssignmentState {
  TOGGLES_OFF_AND_ALL_TEAM_MEMBERS_ENABLED_NOT_APPLICABLE = "TOGGLES_OFF_AND_ALL_TEAM_MEMBERS_ENABLED_NOT_APPLICABLE",
  TOGGLES_OFF_AND_ALL_TEAM_MEMBERS_ENABLED_APPLICABLE = "TOGGLES_OFF_AND_ALL_TEAM_MEMBERS_ENABLED_APPLICABLE",
  ALL_TEAM_MEMBERS_ENABLED = "ALL_TEAM_MEMBERS_ENABLED", // AssignAllTeamMembers is enabled - Means both manual list and segment toggle are hidden
  TEAM_MEMBERS_IN_SEGMENT_ENABLED = "TEAM_MEMBERS_IN_SEGMENT_ENABLED", // assignTeamMembersInSegment is enabled - Means both manual list and AssignAllTeamMembers are hidden
}

function getAssignmentState({
  assignAllTeamMembers,
  assignTeamMembersInSegment,
  isAssigningAllTeamMembersApplicable,
}) {
  if (assignAllTeamMembers) return AssignmentState.ALL_TEAM_MEMBERS_ENABLED;
  if (assignTeamMembersInSegment) return AssignmentState.TEAM_MEMBERS_IN_SEGMENT_ENABLED;
  if (isAssigningAllTeamMembersApplicable)
    return AssignmentState.TOGGLES_OFF_AND_ALL_TEAM_MEMBERS_ENABLED_APPLICABLE;
  return AssignmentState.TOGGLES_OFF_AND_ALL_TEAM_MEMBERS_ENABLED_NOT_APPLICABLE;
}

function _AddMembersWithSwitch({
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
  assignTeamMembersInSegment,
  setAssignTeamMembersInSegment,
}: AddMembersWithSwitchProps) {
  const { t } = useLocale();
  const { setValue } = useFormContext<FormValues>();
  const assignmentState = getAssignmentState({
    assignAllTeamMembers,
    assignTeamMembersInSegment,
    isAssigningAllTeamMembersApplicable: automaticAddAllEnabled,
  });

  const utils = trpc.useUtils();
  utils.viewer.appRoutingForms.getAttributesForTeam.prefetch({
    teamId,
  });

  if (assignmentState === AssignmentState.ALL_TEAM_MEMBERS_ENABLED) {
    return (
      <div className="mb-2">
        <AssignAllTeamMembers
          assignAllTeamMembers={assignAllTeamMembers}
          setAssignAllTeamMembers={setAssignAllTeamMembers}
          onActive={() => {
            setValue("assignTeamMembersInSegment", false, { shouldDirty: true });
            onActive();
          }}
          onInactive={() => setValue("hosts", [], { shouldDirty: true })}
        />
      </div>
    );
  }

  if (assignmentState === AssignmentState.TEAM_MEMBERS_IN_SEGMENT_ENABLED) {
    return (
      <SegmentWithToggle
        teamId={teamId}
        assignTeamMembersInSegment={assignTeamMembersInSegment}
        setAssignTeamMembersInSegment={setAssignTeamMembersInSegment}
      />
    );
  }

  if (
    assignmentState === AssignmentState.TOGGLES_OFF_AND_ALL_TEAM_MEMBERS_ENABLED_NOT_APPLICABLE ||
    assignmentState === AssignmentState.TOGGLES_OFF_AND_ALL_TEAM_MEMBERS_ENABLED_APPLICABLE
  ) {
    return (
      <>
        <div className="mb-2">
          <AssignAllTeamMembers
            assignAllTeamMembers={assignAllTeamMembers}
            setAssignAllTeamMembers={setAssignAllTeamMembers}
            onActive={onActive}
            onInactive={() => setValue("hosts", [], { shouldDirty: true })}
          />
        </div>
        <div className="mb-2">
          <CheckedHostField
            value={value}
            onChange={onChange}
            isFixed={isFixed}
            className="mb-2"
            options={teamMembers.sort(sortByLabel)}
            placeholder={placeholder ?? t("add_attendees")}
            isRRWeightsEnabled={isRRWeightsEnabled}
          />
        </div>
        <div className="mb-2">
          <SegmentWithToggle
            teamId={teamId}
            assignTeamMembersInSegment={assignTeamMembersInSegment}
            setAssignTeamMembersInSegment={setAssignTeamMembersInSegment}
          />
        </div>
      </>
    );
  }
  throw new Error(t("something_went_wrong"));
}

const AddMembersWithSwitch = ({
  containerClassName,
  ...props
}: AddMembersWithSwitchProps & {
  containerClassName?: string;
}) => {
  return (
    <div className="rounded-md ">
      <div className={`flex flex-col rounded-md pb-2 pt-6 ${containerClassName}`}>
        <_AddMembersWithSwitch {...props} />
      </div>
    </div>
  );
};

export default AddMembersWithSwitch;
