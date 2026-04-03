import AssignAllTeamMembers from "@calcom/features/eventtypes/components/AssignAllTeamMembers";
import type { ChildrenEventTypeSelectCustomClassNames } from "@calcom/features/eventtypes/components/ChildrenEventTypeSelect";
import type { FormValues, SettingsToggleClassNames } from "@calcom/features/eventtypes/lib/types";
import classNames from "@calcom/ui/classNames";
import { Controller } from "react-hook-form";
import { ChildrenEventTypesList } from "./ChildrenEventTypesList";
import type { mapMemberToChildrenOption } from "./EventTeamAssignmentTab";

export type ChildrenEventTypesCustomClassNames = {
  container?: string;
  assignAllTeamMembers?: SettingsToggleClassNames;
  childrenEventTypesList?: ChildrenEventTypeSelectCustomClassNames;
};

export const ChildrenEventTypes = ({
  childrenEventTypeOptions,
  assignAllTeamMembers,
  setAssignAllTeamMembers,
  customClassNames,
}: {
  childrenEventTypeOptions: ReturnType<typeof mapMemberToChildrenOption>[];
  assignAllTeamMembers: boolean;
  setAssignAllTeamMembers: (value: boolean) => void;
  customClassNames?: ChildrenEventTypesCustomClassNames;
}) => {
  return (
    <div
      className={classNames(
        "border-subtle stack-y-5 mt-6 rounded-lg border px-4 py-6 sm:px-6",
        customClassNames?.container
      )}>
      <div className="flex flex-col gap-4">
        <AssignAllTeamMembers
          assignAllTeamMembers={assignAllTeamMembers}
          setAssignAllTeamMembers={setAssignAllTeamMembers}
          customClassNames={customClassNames?.assignAllTeamMembers}
        />
        {!assignAllTeamMembers ? (
          <Controller<FormValues>
            name="children"
            render={({ field: { onChange, value } }) => (
              <ChildrenEventTypesList
                value={value}
                options={childrenEventTypeOptions}
                onChange={onChange}
                customClassNames={customClassNames?.childrenEventTypesList}
              />
            )}
          />
        ) : (
          <></>
        )}
      </div>
    </div>
  );
};
