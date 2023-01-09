import { SchedulingType, DistributionMethod } from "@prisma/client/";
import { EventTypeSetupProps, FormValues } from "pages/event-types/[type]";
import { useMemo } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";

import CheckedTeamSelect from "@calcom/features/eventtypes/components/CheckedTeamSelect";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Label, Select, RadioGroup as RadioArea } from "@calcom/ui";

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

  const teamMembersToValues = useMemo(() => {
    return teamMembers.map(mapUserToValue);
  }, [teamMembers]);
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

          <div className="flex flex-col bg-gray-50 p-4">
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
          {schedulingType === SchedulingType.ROUND_ROBIN && (
            <RadioArea.Group className="mt-1 flex w-full space-x-4">
              <RadioArea.Item
                {...formMethods.register("distributionMethod")}
                value={DistributionMethod.OPTIMIZE_AVAILABILITY}
                className="w-1/2 text-sm">
                <strong className="mb-1 block">{t("optimise_for_availability")}</strong>
                <p>{t("optimise_for_availability_description")}</p>
              </RadioArea.Item>
              <RadioArea.Item
                {...formMethods.register("distributionMethod")}
                value={DistributionMethod.OPTIMIZE_FAIRNESS}
                className="w-1/2 text-sm">
                <strong className="mb-1 block">{t("optimise_for_fairness")}</strong>
                <p>{t("optimise_for_fairness_description")}</p>
              </RadioArea.Item>
            </RadioArea.Group>
          )}
        </div>
      )}
    </div>
  );
};
