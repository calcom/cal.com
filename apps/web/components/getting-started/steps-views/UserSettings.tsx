import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { DEFAULT_SCHEDULE } from "@calcom/lib/availability";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import { IdentityProvider } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/button";
import { RadioGroup } from "@calcom/ui/form/radio-area";
import { Icon } from "@calcom/ui/icon";
import { showToast } from "@calcom/ui/toast";
import { Tooltip } from "@calcom/ui/tooltip";

import { TRPCClientError } from "@trpc/client";
import type { TRPCClientErrorLike } from "@trpc/client";

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
  const createEventType = trpc.viewer.eventTypes.create.useMutation();
  const createSchedule = trpc.viewer.availability.schedule.create.useMutation();
  const updateProfile = trpc.viewer.updateProfile.useMutation();
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

  function onError(error: TRPCClientErrorLike<any>) {
    console.error(error);
    showToast(t("something_went_wrong"), "error");
  }

  const createDefaultAvailabilityAndEventTypes = async ({ onSuccess }: { onSuccess: () => void }) => {
    try {
      await Promise.all([
        ...DEFAULT_EVENT_TYPES.map((event) => createEventType.mutateAsync(event)),
        createSchedule.mutateAsync({
          name: t("default_schedule_name"),
          ...DEFAULT_SCHEDULE,
        }),
      ]);
    } catch (e: unknown) {
      if (e instanceof TRPCClientError) {
        onError(e);
        return;
      }
      throw e;
    }
    onSuccess();
  };

  const selectedOptionHandlers = {
    personal: async function handleSetupForPersonalUse() {
      if (user.identityProvider === IdentityProvider.GOOGLE) {
        await createDefaultAvailabilityAndEventTypes({
          onSuccess: () => {
            const redirectUrl = localStorage.getItem("onBoardingRedirect");
            localStorage.removeItem("onBoardingRedirect");
            finishOnboardingAndRedirect(redirectUrl || "/");
          },
        });
      } else {
        await createDefaultAvailabilityAndEventTypes({
          onSuccess: () => nextStep(),
        });
      }
    },
    team: async function handleSetupForTeam() {
      await createDefaultAvailabilityAndEventTypes({
        onSuccess: () => {
          finishOnboardingAndRedirect("/settings/teams/new");
        },
      });
    },
    org: function handleSetupForOrg() {
      // Not possible? - empty anyway
    },
  };

  const finishOnboardingAndRedirect = (redirectUrl: string) => {
    telemetry.event(telemetryEventTypes.onboardingFinished);
    updateProfile.mutate(
      {
        completedOnboarding: true,
      },
      {
        onSuccess: () => {
          router.push(redirectUrl);
        },
        onError,
      }
    );
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await selectedOptionHandlers[selectedOption]();
    return;
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
