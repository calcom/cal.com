import { SchedulingType } from "@prisma/client/";
import { EventTypeSetupInfered, FormValues } from "pages/event-types/[type]";
import { useMemo } from "react";
import { Controller, useFormContext } from "react-hook-form";

import CheckedTeamSelect from "@calcom/features/eventtypes/components/CheckedTeamSelect";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Avatar, Button, Icon, Label, Select } from "@calcom/ui";

interface IMemberToValue {
  id: number | null;
  name: string | null;
  username: string | null;
  email: string;
}

const mapUserToValue = ({ id, name, username, email }: IMemberToValue) => ({
  value: `${id || ""}`,
  label: `${name || ""}`,
  avatar: `${WEBAPP_URL}/${username}/avatar.png`,
  email,
});

export const EventTeamTab = ({
  eventType,
  team,
  teamMembers,
  currentUserMembership,
}: Pick<EventTypeSetupInfered, "eventType" | "teamMembers" | "team" | "currentUserMembership">) => {
  const formMethods = useFormContext<FormValues>();
  const { t } = useLocale();

  const schedulingTypeOptions: {
    value: SchedulingType;
    label: string;
    // description: string;
  }[] = [
    {
      value: SchedulingType.COLLECTIVE,
      label: t("collective"),
      // description: t("collective_description"),
    },
    {
      value: SchedulingType.ROUND_ROBIN,
      label: t("round_robin"),
      // description: t("round_robin_description"),
    },
  ];

  const teamMembersToValues = useMemo(() => {
    return teamMembers.map(mapUserToValue);
  }, [teamMembers]);
  return (
    <div>
      {team && (
        <div className="space-y-3">
          <div className="flex flex-col pb-8">
            <Label>{t("scheduling_type")}</Label>
            <Controller
              name="schedulingType"
              control={formMethods.control}
              render={({ field: { value, onChange } }) => (
                <Select
                  options={schedulingTypeOptions}
                  value={schedulingTypeOptions.find((opt) => opt.value === value)}
                  className="w-full"
                  onChange={(val) => {
                    onChange(val?.value);
                  }}
                />
              )}
            />
          </div>

          <div className="flex flex-col">
            <Label>{t("team")}</Label>
            <Controller
              name="users"
              control={formMethods.control}
              defaultValue={eventType.users.map((user) => user.id.toString())}
              render={({ field: { onChange, value } }) => (
                <CheckedTeamSelect
                  isDisabled={false}
                  onChange={(options) => onChange(options.map((user) => user.value))}
                  value={value
                    .map(
                      (userId) =>
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        teamMembers.map(mapUserToValue).find((member) => member.value === userId)!
                    )
                    .filter(Boolean)}
                  controlShouldRenderValue={false}
                  options={teamMembersToValues}
                  placeholder={t("add_attendees")}
                />
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const TeamProfileCard = ({
  id,
  name,
  hasPermsToDelete,
  email,
  username,
}: {
  id: number;
  name: string | null;
  email: string;
  username: string | null;
  hasPermsToDelete: boolean;
}) => {
  const formMethods = useFormContext<FormValues>();
  const avatar = `${WEBAPP_URL}/${username}/avatar.png`;

  return (
    <div className="flex items-center border border-gray-300 px-6 py-4 first:rounded-t-md last:rounded-b-md only:rounded-md">
      <Avatar imageSrc={avatar} gravatarFallbackMd5="ajsdkwakhsd1231" size="md" alt="Team Image" />
      <div className="flex flex-col pl-3">
        <div className="">
          <span className="pr-2 text-sm font-semibold leading-none text-black">{name}</span>
        </div>
        <p className="text-sm font-normal leading-normal text-gray-700">{email}</p>
      </div>
      {hasPermsToDelete && (
        <div className="ml-auto">
          <Button
            type="button"
            size="icon"
            color="destructive"
            StartIcon={Icon.FiTrash}
            onClick={() => {
              formMethods.setValue(
                "users",
                formMethods.getValues("users").filter((user) => user !== id.toString())
              );
            }}
          />
        </div>
      )}
    </div>
  );
};
