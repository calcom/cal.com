import { SchedulingType } from "@prisma/client/";
import { EventTypeSetupProps, FormValues } from "pages/event-types/[type]";
import { useMemo } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";

import CheckedTeamSelect from "@calcom/features/eventtypes/components/CheckedTeamSelect";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Label, Select, TextField } from "@calcom/ui";

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
}: Pick<EventTypeSetupProps, "eventType" | "teamMembers" | "team">) => {
  const formMethods = useFormContext<FormValues>();
  const { t } = useLocale();

  const schedulingType = useWatch({
    control: formMethods.control,
    name: "schedulingType",
  });

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

  return (
    <div>
      {team && (
        <div className="space-y-5">
          <div className="flex flex-col">
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

          {schedulingType === SchedulingType.COLLECTIVE && (
            <div className="flex flex-col space-y-5 bg-gray-50 p-4">
              <div>
                <Label>{t("team")}</Label>
                <Controller
                  name="hostsFixed"
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
                      options={teamMembers.map(mapUserToValue).filter((member) => {
                        return member;
                      })}
                      placeholder={t("add_attendees")}
                    />
                  )}
                />
              </div>
            </div>
          )}

          {schedulingType === SchedulingType.ROUND_ROBIN && (
            <>
              <div className="flex flex-col bg-gray-50 p-4">
                <Label>{t("fixed_hosts")}</Label>
                <Controller
                  name="hostsFixed"
                  control={formMethods.control}
                  render={({ field: { onChange, value } }) => {
                    return (
                      <CheckedTeamSelect
                        isDisabled={false}
                        onChange={(options) => {
                          onChange(
                            options.map((option) => ({
                              isFixed: true,
                              userId: parseInt(option.value, 10),
                            }))
                          );
                        }}
                        value={value
                          .map(
                            (host) =>
                              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                              teamMembers
                                .map(mapUserToValue)
                                .find((member) => member.value === host.userId.toString())!
                          )
                          .filter(Boolean)}
                        controlShouldRenderValue={false}
                        options={teamMembers.map(mapUserToValue).filter((member) => {
                          return !formMethods
                            .getValues("hosts")
                            .find((host) => host.userId.toString() === member.value);
                        })}
                        placeholder={t("add_fixed_hosts")}
                      />
                    );
                  }}
                />
              </div>
              <div className="flex flex-col space-y-5 bg-gray-50 p-4">
                <div>
                  <Label>{t("round_robin_hosts")}</Label>
                  <Controller
                    name="hosts"
                    control={formMethods.control}
                    render={({ field: { onChange, value } }) => (
                      <CheckedTeamSelect
                        isDisabled={false}
                        onChange={(options) =>
                          onChange(
                            options.map((option) => ({
                              isFixed: false,
                              userId: parseInt(option.value, 10),
                            }))
                          )
                        }
                        value={value
                          .map(
                            (host) =>
                              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                              teamMembers
                                .map(mapUserToValue)
                                .find((member) => member.value === host.userId.toString())!
                          )
                          .filter(Boolean)}
                        controlShouldRenderValue={false}
                        options={teamMembers.map(mapUserToValue).filter((member) => {
                          return !formMethods
                            .getValues("hostsFixed")
                            .find((host) => host.userId.toString() === member.value);
                        })}
                        placeholder={t("add_attendees")}
                      />
                    )}
                  />
                </div>
                {/*<TextField
                  required
                  type="number"
                  label={t("minimum_round_robin_hosts_count")}
                  defaultValue={1}
                  {...formMethods.register("minimumHostCount")}
                  addOnSuffix={<>{t("hosts")}</>}
                          />*/}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
