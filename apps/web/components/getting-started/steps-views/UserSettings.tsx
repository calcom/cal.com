import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { DEFAULT_SCHEDULE } from "@calcom/lib/availability";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import { IdentityProvider } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Button, showToast, Icon, Tooltip, RadioGroup } from "@calcom/ui";

type AccountOption = "personal" | "team" | "org";

interface IUserSettingsProps {
  nextStep: () => void;
}

const UserSettings = (props: IUserSettingsProps) => {
  const [selectedOption, setSelectedOption] = useState<AccountOption>("personal");
  const { nextStep } = props;
  const [user] = trpc.viewer.me.useSuspenseQuery();
  const { t } = useLocale();
  const router = useRouter();
  const telemetry = useTelemetry();
  const { data: eventTypes } = trpc.viewer.eventTypes.list.useQuery();
  const { data: availabilities } = trpc.viewer.availability.list.useQuery();
  const createEventType = trpc.viewer.eventTypes.create.useMutation();
  const createSchedule = trpc.viewer.availability.schedule.create.useMutation();
  const updateProfile = trpc.viewer.updateProfile.useMutation();
  const utils = trpc.useUtils();
  const isPending = createEventType.isPending || createSchedule.isPending || updateProfile.isPending;
  const options = [
    {
      value: "personal",
      icon: "user",
      title: t("for_personal_use"),
      description: t("for_personal_use_description"),
      disabled: false,
      tooltip: null,
    },
    {
      value: "team",
      icon: "users",
      title: t("with_my_team"),
      description: t("with_my_team_description"),
      disabled: false,
      tooltip: null,
    },
    {
      value: "org",
      icon: "building",
      title: t("for_my_organization"),
      description: t("for_my_organization_description"),
      disabled: true,
      tooltip: t("contact_sales"),
    },
  ] as const;

  const DEFAULT_EVENT_TYPES = [
    {
      title: t("15min_meeting"),
      slug: "15min",
      length: 15,
    },
    {
      title: t("30min_meeting"),
      slug: "30min",
      length: 30,
    },
    {
      title: t("secret_meeting"),
      slug: "secret",
      length: 15,
      hidden: true,
    },
  ] as const;

  useEffect(() => {
    telemetry.event(telemetryEventTypes.onboardingStarted);
  }, [telemetry]);

  const createDefaultAvailabilityAndEventTypes = async () => {
    await Promise.all([
      // create default event types
      ...(eventTypes?.length === 0 ? DEFAULT_EVENT_TYPES.map((event) => createEventType.mutate(event)) : []),
      // create default availability
      ...(availabilities?.schedules.length === 0
        ? [
            createSchedule.mutate({
              name: t("default_schedule_name"),
              ...DEFAULT_SCHEDULE,
            }),
          ]
        : []),
    ]);

    await utils.viewer.me.refetch();
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      if (selectedOption === "personal" && user.identityProvider === IdentityProvider.GOOGLE) {
        telemetry.event(telemetryEventTypes.onboardingFinished);
        updateProfile.mutate({
          completedOnboarding: true,
        });
        await createDefaultAvailabilityAndEventTypes();
        const redirectUrl = localStorage.getItem("onBoardingRedirect");
        localStorage.removeItem("onBoardingRedirect");
        redirectUrl ? router.push(redirectUrl) : router.push("/");
        return;
      }

      if (selectedOption === "personal" && user.identityProvider !== IdentityProvider.GOOGLE) {
        await createDefaultAvailabilityAndEventTypes();
        nextStep();
        return;
      }

      if (selectedOption === "team") {
        telemetry.event(telemetryEventTypes.onboardingFinished);
        updateProfile.mutate({
          completedOnboarding: true,
        });
        await createDefaultAvailabilityAndEventTypes();
        router.push("/settings/teams/new");
        return;
      }
    } catch (error) {
      showToast(`Error: ${error}`, "error");
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <div className="space-y-6">
        <RadioGroup.Group
          defaultValue="personal"
          value={selectedOption}
          onValueChange={(value: string) => setSelectedOption(value as AccountOption)}
          className="space-y-4">
          {options.map(({ value, icon, title, description, disabled, tooltip }) => {
            const Content = (
              <div className="flex-1 space-y-1">
                <div className="flex items-center space-x-2">
                  <Icon name={icon} className={`h-4 w-4 ${disabled ? "text-muted" : ""}`} />
                  <p className={`text-sm font-bold leading-4 ${disabled ? "text-muted" : "text-emphasis"}`}>
                    {title}
                  </p>
                </div>
                <p className={`text-sm leading-5 ${disabled ? "text-muted" : "text-subtle"}`}>
                  {description}
                </p>
              </div>
            );

            return (
              <RadioGroup.Item key={value} value={value} id={value} disabled={disabled}>
                {tooltip ? <Tooltip content={tooltip}>{Content}</Tooltip> : Content}
              </RadioGroup.Item>
            );
          })}
        </RadioGroup.Group>
      </div>
      <Button
        type="submit"
        className="mt-8 flex w-full flex-row justify-center"
        loading={isPending}
        disabled={isPending}>
        {t("continue")}
        <Icon name="arrow-right" className="ml-2 h-4 w-4 self-center" aria-hidden="true" />
      </Button>
    </form>
  );
};

export { UserSettings };
