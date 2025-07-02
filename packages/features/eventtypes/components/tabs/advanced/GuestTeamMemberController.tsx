import { useState, useEffect } from "react";
import { Controller, useFormContext } from "react-hook-form";

import CheckedTeamSelect from "@calcom/features/eventtypes/components/CheckedTeamSelect";
import type { CheckedSelectOption } from "@calcom/features/eventtypes/components/CheckedTeamSelect";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { SettingsToggle } from "@calcom/ui/components/form";

import type { EventTypeSetup, FormValues } from "../../../lib/types";

type GuestTeamMemberControllerProps = {
  team: EventTypeSetup["team"];
  eventType: EventTypeSetup;
};

function GuestTeamMemberController({ team, eventType }: GuestTeamMemberControllerProps) {
  const { t } = useLocale();

  const formMethods = useFormContext<FormValues>();

  const [isGuestTeamMembersEnabled, setIsGuestTeamMembersEnabled] = useState(
    eventType.optionalGuestTeamMembers.length > 0
  );

  useEffect(() => {
    setIsGuestTeamMembersEnabled(eventType.optionalGuestTeamMembers.length > 0);
  }, [eventType.optionalGuestTeamMembers]);

  const addedGuestTeamMembers = formMethods.watch("optionalGuestTeamMembers", []);

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
                isGuestTeamMembersEnabled && "rounded-b-none"
              )}
              labelClassName={classNames("text-sm")}
              checked={isGuestTeamMembersEnabled}
              toggleSwitchAtTheEnd={true}
              onCheckedChange={(checked) => {
                setIsGuestTeamMembersEnabled(checked);
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
                  value={(addedGuestTeamMembers || []).reduce((acc, host) => {
                    const option = team.members?.find((member) => member.user.id === host.id);
                    if (!option) return acc;

                    acc.push({
                      value: option.user.id.toString(),
                      avatar: option.user.avatarUrl || "",
                      label: option.user.email,
                      isFixed: true,
                    });
                    return acc;
                  }, [] as CheckedSelectOption[])}
                  options={team?.members.map((member) => ({
                    avatar: member.user.avatarUrl || "",
                    label: member.user.email || "",
                    value: member.user.id.toString() || "",
                  }))}
                  controlShouldRenderValue={false}
                />
              </div>
            </SettingsToggle>
          </div>
        )}
      />
    </div>
  );
}

export default GuestTeamMemberController;
