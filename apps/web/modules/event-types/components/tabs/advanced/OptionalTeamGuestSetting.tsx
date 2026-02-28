import type { FormValues, TeamMember } from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Select, SettingsToggle } from "@calcom/ui";
import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

type OptionalTeamGuestSettingProps = {
  teamMembers: TeamMember[];
};

const OptionalTeamGuestSetting = ({ teamMembers }: OptionalTeamGuestSettingProps) => {
  const { t } = useLocale();
  const formMethods = useFormContext<FormValues>();

  // Watch form value reactively at component top level (not inside render callback)
  const currentValue = useWatch({ control: formMethods.control, name: "optionalGuestTeamMembers" });
  const selectedValues = (currentValue || []).map((m) => m.id);
  const hasSelection = selectedValues.length > 0;

  // Local state to control toggle visibility — initialized from saved form data.
  // This allows toggling ON to reveal the Select even when nothing is selected yet.
  const [isExpanded, setIsExpanded] = useState(hasSelection);

  const teamMemberOptions = teamMembers.map((member) => ({
    value: Number(member.value),
    label: member.label,
  }));

  const selectedOptions = teamMemberOptions.filter((opt) => selectedValues.includes(opt.value));

  return (
    <SettingsToggle
      labelClassName="text-sm"
      toggleSwitchAtTheEnd={true}
      switchContainerClassName="border-subtle rounded-lg border py-6 px-4 sm:px-6"
      childrenClassName="lg:ml-0"
      title={t("optional_team_guest_setting")}
      data-testid="optional-team-guest-toggle"
      description={t("optional_team_guest_setting_description")}
      checked={isExpanded || hasSelection}
      onCheckedChange={(checked) => {
        setIsExpanded(checked);
        if (!checked) {
          formMethods.setValue("optionalGuestTeamMembers", [], { shouldDirty: true });
        }
      }}>
      <div className="border-subtle rounded-b-lg border border-t-0 p-6">
        <Select
          isMulti
          name="optionalGuestTeamMembers"
          placeholder={t("select_team_members")}
          options={teamMemberOptions}
          value={selectedOptions}
          onChange={(selected) => {
            formMethods.setValue(
              "optionalGuestTeamMembers",
              selected.map((opt) => ({ id: opt.value })),
              { shouldDirty: true }
            );
          }}
        />
      </div>
    </SettingsToggle>
  );
};

export default OptionalTeamGuestSetting;
