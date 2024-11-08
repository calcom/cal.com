import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import { trpc } from "@calcom/trpc/react";
import { Button, Icon, Tooltip, RadioGroup } from "@calcom/ui";

interface IUserSettingsProps {
  nextStep: () => void;
}

const options = [
  {
    value: "personal",
    icon: "user",
    titleKey: "for_personal_use",
    descriptionKey: "for_personal_use_description",
    disabled: false,
  },
  {
    value: "team",
    icon: "users",
    titleKey: "with_my_team",
    descriptionKey: "with_my_team_description",
    disabled: false,
  },
  {
    value: "org",
    icon: "building",
    titleKey: "for_my_organization",
    descriptionKey: "for_my_organization_description",
    disabled: true,
    tooltip: "contact_sales",
  },
] as const;

const UserSettings = (props: IUserSettingsProps) => {
  const [selectedOption, setSelectedOption] = useState("personal");
  const { nextStep } = props;
  const [user] = trpc.viewer.me.useSuspenseQuery();
  const { t } = useLocale();
  console.log(user);
  const telemetry = useTelemetry();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      type: "personal",
    },
    reValidateMode: "onChange",
  });

  useEffect(() => {
    telemetry.event(telemetryEventTypes.onboardingStarted);
  }, [telemetry]);

  const utils = trpc.useUtils();
  const onSuccess = async () => {
    await utils.viewer.me.invalidate();
    nextStep();
  };
  const mutation = trpc.viewer.updateProfile.useMutation({
    onSuccess: onSuccess,
  });

  const onSubmit = handleSubmit((data) => {
    mutation.mutate({
      type: data.type,
    });
  });

  return (
    <form onSubmit={onSubmit}>
      <div className="space-y-6">
        <RadioGroup.Group
          defaultValue="personal"
          value={selectedOption}
          onValueChange={setSelectedOption}
          className="space-y-4">
          {options.map(({ value, icon, titleKey, descriptionKey, disabled, tooltip }) => {
            const Content = (
              <div className="flex-1 space-y-1">
                <div className="flex items-center space-x-2">
                  <Icon name={icon} className={`h-4 w-4 ${disabled ? "text-muted" : ""}`} />
                  <p className={`text-sm font-bold leading-4 ${disabled ? "text-muted" : "text-emphasis"}`}>
                    {t(titleKey)}
                  </p>
                </div>
                <p className={`text-sm leading-5 ${disabled ? "text-muted" : "text-subtle"}`}>
                  {t(descriptionKey)}
                </p>
              </div>
            );

            return (
              <RadioGroup.Item key={value} value={value} id={value} disabled={disabled}>
                {tooltip ? <Tooltip content={t(tooltip)}>{Content}</Tooltip> : Content}
              </RadioGroup.Item>
            );
          })}
        </RadioGroup.Group>
      </div>
      <Button
        type="submit"
        className="mt-8 flex w-full flex-row justify-center"
        loading={mutation.isPending}
        disabled={mutation.isPending}>
        {t("continue")}
        <Icon name="arrow-right" className="ml-2 h-4 w-4 self-center" aria-hidden="true" />
      </Button>
    </form>
  );
};

export { UserSettings };
