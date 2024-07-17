import type { ComponentProps, Dispatch, SetStateAction } from "react";
import { useFormContext } from "react-hook-form";
import type { Options } from "react-select";

import type { FormValues, Host, TeamMember } from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Label } from "@calcom/ui";

import AssignAllTeamMembers from "./AssignAllTeamMembers";
import CheckedTeamSelect from "./CheckedTeamSelect";
import type { CheckedSelectOption } from "./CheckedTeamSelect";

interface IUserToValue {
  id: number | null;
  name: string | null;
  username: string | null;
  avatar: string;
  email: string;
}

export const mapUserToValue = (
  { id, name, username, avatar, email }: IUserToValue,
  pendingString: string
) => ({
  value: `${id || ""}`,
  label: `${name || email || ""}${!username ? ` (${pendingString})` : ""}`,
  avatar,
  email,
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
  ...rest
}: {
  labelText?: string;
  placeholder: string;
  isFixed: boolean;
  value: Host[];
  onChange?: (options: Host[]) => void;
  options?: Options<CheckedSelectOption>;
  helperText?: React.ReactNode | string;
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
                }))
              );
          }}
          value={(value || [])
            .filter(({ isFixed: _isFixed }) => isFixed === _isFixed)
            .map((host) => {
              const option = options.find((member) => member.value === host.userId.toString());
              return option ? { ...option, priority: host.priority ?? 2, isFixed } : options[0];
            })
            .filter(Boolean)}
          controlShouldRenderValue={false}
          options={options}
          placeholder={placeholder}
          {...rest}
        />
      </div>
    </div>
  );
};

const AddMembersWithSwitch = ({
  teamMembers,
  value,
  onChange,
  assignAllTeamMembers,
  setAssignAllTeamMembers,
  automaticAddAllEnabled,
  onActive,
  isFixed,
  placeholder = "",
  containerClassName = "",
}: {
  value: Host[];
  onChange: (hosts: Host[]) => void;
  teamMembers: TeamMember[];
  assignAllTeamMembers: boolean;
  setAssignAllTeamMembers: Dispatch<SetStateAction<boolean>>;
  automaticAddAllEnabled: boolean;
  onActive: () => void;
  isFixed: boolean;
  placeholder?: string;
  containerClassName?: string;
}) => {
  const { t } = useLocale();
  const { setValue } = useFormContext<FormValues>();

  return (
    <div className="rounded-md ">
      <div className={`flex flex-col rounded-md px-6 pb-2 pt-6 ${containerClassName}`}>
        {automaticAddAllEnabled ? (
          <div className="mb-2">
            <AssignAllTeamMembers
              assignAllTeamMembers={assignAllTeamMembers}
              setAssignAllTeamMembers={setAssignAllTeamMembers}
              onActive={onActive}
              onInactive={() => setValue("hosts", [], { shouldDirty: true })}
            />
          </div>
        ) : (
          <></>
        )}
        {!assignAllTeamMembers || !automaticAddAllEnabled ? (
          <CheckedHostField
            value={value}
            onChange={onChange}
            isFixed={isFixed}
            options={teamMembers.sort(sortByLabel)}
            placeholder={placeholder ?? t("add_attendees")}
          />
        ) : (
          <></>
        )}
      </div>
    </div>
  );
};

export default AddMembersWithSwitch;
