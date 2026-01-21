import { useState, useEffect, useMemo } from "react";
import { Controller, useFormContext } from "react-hook-form";

import CheckedTeamSelect from "@calcom/features/eventtypes/components/CheckedTeamSelect";
import type { CheckedSelectOption } from "@calcom/features/eventtypes/components/CheckedTeamSelect";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { SettingsToggle } from "@calcom/ui/components/form";

import type { EventTypeSetup, FormValues } from "../../../lib/types";

type OptionalTeamGuestSettingProps = {
  team: EventTypeSetup["team"];
  eventType: EventTypeSetup;
};

function OptionalTeamGuestSetting({ team, eventType }: OptionalTeamGuestSettingProps) {
  const { t } = useLocale();

  const formMethods = useFormContext<FormValues>();

  const [isOptionalTeamGuestEnabled, setIsOptionalTeamGuestEnabled] = useState(
    eventType.optionalGuestTeamMembers.length > 0
  );

  useEffect(() => {
    setIsOptionalTeamGuestEnabled(eventType.optionalGuestTeamMembers.length > 0);
  }, [eventType.optionalGuestTeamMembers]);

  const addedGuestTeamMembers = formMethods.watch("optionalGuestTeamMembers", []);

  const selectedValue = useMemo(() => {
    if (!team?.members) return [];

    return (addedGuestTeamMembers || []).reduce((acc: CheckedSelectOption[], host) => {
      const option = team.members.find((member) => member.user.id === host.id);

      if (option) {
        acc.push({
          value: option.user.id.toString(),
          avatar: option.user.avatarUrl || "",
          label: option.user.email || t("no_email"),
          isFixed: true,
          groupId: null,
        });
      }

      return acc;
    }, []);
  }, [addedGuestTeamMembers, team?.members]);

  if (!team) {
    return null;
  }

  return (
    <div className="block w-full items-start sm:flex">
      <Controller
        name="optionalGuestTeamMembers"
        control={formMethods.control}
        render={({ field: { onChange } }) => (
          <div className="w-full">
            <SettingsToggle
              title={t("optional_guest_team_members")}
              description={t("optional_guest_team_members_description")}
              childrenClassName={classNames("lg:ml-0")}
              switchContainerClassName={classNames(
                "border-subtle rounded-lg border py-6 px-4 sm:px-6",
                isOptionalTeamGuestEnabled && "rounded-b-none"
              )}
              labelClassName={classNames("text-sm")}
              checked={isOptionalTeamGuestEnabled}
              toggleSwitchAtTheEnd={true}
              onCheckedChange={(checked) => {
                setIsOptionalTeamGuestEnabled(checked);
                if (!checked) {
                  onChange([]);
                }
              }}>
              <div className="border-subtle flex flex-col gap-4 rounded-b-lg border border-t-0 p-6">
                <CheckedTeamSelect
                  onChange={(options) => {
                    if (!onChange) return;
                    onChange(options.map((option) => ({ id: parseInt(option.value) })));
                  }}
                  value={selectedValue}
                  options={
                    team?.members.map((member) => ({
                      avatar: member.user.avatarUrl || "",
                      label: member.user.email || "",
                      value: member.user.id.toString() || "",
                      groupId: null,
                    })) || []
                  }
                  controlShouldRenderValue={false}
                  groupId={null}
                />
              </div>
            </SettingsToggle>
          </div>
        )}
      />
    </div>
  );
}

export default OptionalTeamGuestSetting;
