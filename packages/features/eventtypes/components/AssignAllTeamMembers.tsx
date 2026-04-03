import { Controller } from "react-hook-form";

import type { FormValues, SettingsToggleClassNames } from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SettingsToggle } from "@calcom/ui/components/form";
import classNames from "@calcom/ui/classNames";

const AssignAllTeamMembers = ({
  assignAllTeamMembers,
  setAssignAllTeamMembers,
  customClassNames,
}: {
  assignAllTeamMembers: boolean;
  setAssignAllTeamMembers: (active: boolean) => void;
  customClassNames?: SettingsToggleClassNames;
}) => {
  const { t } = useLocale();

  return (
    <Controller<FormValues>
      name="assignAllTeamMembers"
      render={() => (
        <SettingsToggle
          data-testid="assign-all-team-members-toggle"
          title={t("automatically_add_all_team_members")}
          labelClassName={classNames("mt-[3px] text-sm", customClassNames?.label)}
          switchContainerClassName={customClassNames?.container}
          checked={assignAllTeamMembers}
          onCheckedChange={setAssignAllTeamMembers}
        />
      )}
    />
  );
};

export default AssignAllTeamMembers;
