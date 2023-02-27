import { SchedulingType } from "@prisma/client";
import type { EventTypeSetupProps, FormValues } from "pages/event-types/[type]";
import type { ComponentProps } from "react";
import type { Control } from "react-hook-form";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import type { Options } from "react-select";

import type { CheckedSelectOption } from "@calcom/features/eventtypes/components/CheckedTeamSelect";
import CheckedTeamSelect from "@calcom/features/eventtypes/components/CheckedTeamSelect";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Label, Select } from "@calcom/ui";

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

const sortByLabel = (a: ReturnType<typeof mapUserToValue>, b: ReturnType<typeof mapUserToValue>) => {
  if (a.label < b.label) {
    return -1;
  }
  if (a.label > b.label) {
    return 1;
  }
  return 0;
};

const FixedHosts = ({
  control,
  labelText,
  placeholder,
  options = [],
  ...rest
}: {
  control: Control<FormValues>;
  labelText: string;
  placeholder: string;
  options?: Options<CheckedSelectOption>;
} & Partial<ComponentProps<typeof CheckedTeamSelect>>) => {
  return (
    <div className="flex flex-col space-y-5 bg-gray-50 p-4">
      <div>
        <Label>{labelText}</Label>
        <Controller
          name="hostsFixed"
          control={control}
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
                      options.find((member) => member.value === host.userId.toString())!
                  )
                  .filter(Boolean)}
                controlShouldRenderValue={false}
                options={options}
                placeholder={placeholder}
                {...rest}
              />
            );
          }}
        />
      </div>
    </div>
  );
};

export const EventTeamTab = ({ team, teamMembers }: Pick<EventTypeSetupProps, "teamMembers" | "team">) => {
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

  const teamMembersOptions = teamMembers.map(mapUserToValue);
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
            <FixedHosts
              options={teamMembersOptions.sort(sortByLabel)}
              placeholder={t("add_attendees")}
              labelText={t("team")}
              control={formMethods.control}
            />
          )}
          {schedulingType === SchedulingType.ROUND_ROBIN && (
            <>
              <FixedHosts
                options={teamMembersOptions.sort(sortByLabel)}
                isOptionDisabled={(option) =>
                  !!formMethods.getValues("hosts").find((host) => host.userId.toString() === option.value)
                }
                placeholder={t("add_fixed_hosts")}
                labelText={t("fixed_hosts")}
                control={formMethods.control}
              />
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
                        options={teamMembersOptions.sort(sortByLabel)}
                        isOptionDisabled={(option) =>
                          !!formMethods
                            .getValues("hostsFixed")
                            .find((host) => host.userId.toString() === option.value)
                        }
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
