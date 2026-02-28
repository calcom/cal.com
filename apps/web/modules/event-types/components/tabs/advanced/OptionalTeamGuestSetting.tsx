import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";

import type { FormValues, TeamMember } from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SettingsToggle, Select } from "@calcom/ui";

type OptionalTeamGuestSettingProps = {
  teamMembers: TeamMember[];
};

const OptionalTeamGuestSetting = ({ teamMembers }: OptionalTeamGuestSettingProps) => {
  const { t } = useLocale();
  const formMethods = useFormContext<FormValues>();

  const teamMemberOptions = teamMembers.map((member) => ({
    value: Number(member.value),
    label: member.label,
  }));

  return (
    <Controller
      name="optionalGuestTeamMembers"
      control={formMethods.control}
      render={({ field: { value, onChange } }) => {
        const selectedValues = (value || []).map((m) => m.id);
        const hasSelection = selectedValues.length > 0;
        const selectedOptions = teamMemberOptions.filter((opt) => selectedValues.includes(opt.value));

        // Track whether the user has explicitly enabled this feature.
        // The toggle is ON when there are selected members.
        // When toggled OFF, we clear all selections.
        const [isExpanded, setIsExpanded] = useState(hasSelection);

        return (
          <SettingsToggle
            labelClassName="text-sm"
            toggleSwitchAtTheEnd={true}
            switchContainerClassName="border-subtle rounded-lg border py-6 px-4 sm:px-6"
            childrenClassName="lg:ml-0"
            title={t("optional_team_guest_setting")}
            data-testid="optional-team-guest-toggle"
            description={t("optional_team_guest_setting_description")}
            checked={isExpanded}
            onCheckedChange={(checked) => {
              setIsExpanded(checked);
              if (!checked) {
                onChange([]);
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
                  onChange(
                    selected.map((opt) => ({
                      id: opt.value,
                    }))
                  );
                }}
              />
            </div>
          </SettingsToggle>
        );
      }}
    />
  );
};

export default OptionalTeamGuestSetting;
