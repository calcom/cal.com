"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Toaster } from "sonner";
import type { z } from "zod";

import checkForMultiplePaymentApps from "@calcom/app-store/_utils/payments/checkForMultiplePaymentApps";
import useAddAppMutation from "@calcom/app-store/_utils/useAddAppMutation";
import type { LocationObject } from "@calcom/app-store/locations";
import type { EventTypeAppSettingsComponentProps, EventTypeModel } from "@calcom/app-store/types";
import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/app-store/zod-utils";
import type { LocationFormValues } from "@calcom/features/eventtypes/lib/types";
import { AppOnboardingSteps } from "@calcom/lib/apps/appOnboardingSteps";
import { getAppOnboardingUrl } from "@calcom/lib/apps/getAppOnboardingUrl";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { Team } from "@calcom/prisma/client";
import type { eventTypeBookingFields } from "@calcom/prisma/zod-utils";
import type { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import type { AppMeta } from "@calcom/types/App";
import { Form, Steps } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

import { HttpError } from "@lib/core/http/error";

import type { PersonalAccountProps } from "@components/apps/installation/AccountsStepCard";
import { AccountsStepCard } from "@components/apps/installation/AccountsStepCard";
import { ConfigureStepCard } from "@components/apps/installation/ConfigureStepCard";
import { EventTypesStepCard } from "@components/apps/installation/EventTypesStepCard";
import { StepHeader } from "@components/apps/installation/StepHeader";

import { STEPS } from "~/apps/installation/[[...step]]/constants";

export type TEventType = EventTypeAppSettingsComponentProps["eventType"] &
  Pick<
    EventTypeModel,
    | "metadata"
    | "schedulingType"
    | "slug"
    | "requiresConfirmation"
    | "position"
    | "destinationCalendar"
    | "calVideoSettings"
  > & {
    selected: boolean;
    locations: LocationFormValues["locations"];
    bookingFields?: LocationFormValues["bookingFields"];
  };

export type TEventTypeGroup = {
  teamId?: number;
  userId?: number | null;
  slug?: string | null;
  name?: string | null;
  image: string;
  isOrganisation?: boolean;
  eventTypes: TEventType[];
};

export type TEventTypesForm = {
  eventTypeGroups: TEventTypeGroup[];
};

type StepType = (typeof STEPS)[number];

type StepObj = Record<
  StepType,
  {
    getTitle: (appName: string) => string;
    getDescription: (appName: string) => string;
    stepNumber: number;
  }
>;

export type TTeams = (Pick<Team, "id" | "name" | "logoUrl" | "isOrganization"> & {
  alreadyInstalled: boolean;
})[];

export type OnboardingPageProps = {
  appMetadata: AppMeta;
  step: StepType;
  teams?: TTeams;
  personalAccount: PersonalAccountProps;
  eventTypeGroups?: TEventTypeGroup[];
  userName: string;
  credentialId?: number;
  showEventTypesStep: boolean;
  isConferencing: boolean;
  installableOnTeams: boolean;
  isOrg: boolean;
};

type TUpdateObject = {
  id: number;
  metadata?: z.infer<typeof EventTypeMetaDataSchema>;
  bookingFields?: z.infer<typeof eventTypeBookingFields>;
  locations?: LocationObject[];
};

const OnboardingPage = ({
  step,
  teams,
  personalAccount,
  appMetadata,
  eventTypeGroups,
  userName,
  credentialId,
  showEventTypesStep,
  isConferencing,
  installableOnTeams,
}: OnboardingPageProps) => {
  const { t } = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const STEPS_MAP: StepObj = {
    [AppOnboardingSteps.ACCOUNTS_STEP]: {
      getTitle: () => `${t("select_account_header")}`,
      getDescription: (appName) =>
        `${t("select_account_description", { appName, interpolation: { escapeValue: false } })}`,
      stepNumber: 1,
    },
    [AppOnboardingSteps.EVENT_TYPES_STEP]: {
      getTitle: () => `${t("select_event_types_header")}`,
      getDescription: (appName) =>
        `${t("select_event_types_description", { appName, interpolation: { escapeValue: false } })}`,
      stepNumber: installableOnTeams ? 2 : 1,
    },
    [AppOnboardingSteps.CONFIGURE_STEP]: {
      getTitle: (appName) =>
        `${t("configure_app_header", { appName, interpolation: { escapeValue: false } })}`,
      getDescription: () => `${t("configure_app_description")}`,
      stepNumber: installableOnTeams ? 3 : 2,
    },
  } as const;
  const [configureStep, setConfigureStep] = useState(false);

  const currentStep: AppOnboardingSteps = useMemo(() => {
    if (step == AppOnboardingSteps.EVENT_TYPES_STEP && configureStep) {
      return AppOnboardingSteps.CONFIGURE_STEP;
    }
    return step;
  }, [step, configureStep]);
  const stepObj = STEPS_MAP[currentStep];

  const maxSteps = useMemo(() => {
    if (!showEventTypesStep) {
      return 1;
    }
    return installableOnTeams ? STEPS.length : STEPS.length - 1;
  }, [showEventTypesStep, installableOnTeams]);

  const utils = trpc.useContext();

  const formPortalRef = useRef<HTMLDivElement>(null);

  const formMethods = useForm<TEventTypesForm>({
    defaultValues: {
      eventTypeGroups,
    },
  });
  const mutation = useAddAppMutation(null, {
    onSuccess: (data) => {
      if (data?.setupPending) return;
      showToast(t("app_successfully_installed"), "success");
    },
    onError: (error) => {
      if (error instanceof Error) showToast(error.message || t("app_could_not_be_installed"), "error");
    },
  });

  useEffect(() => {
    eventTypeGroups && formMethods.setValue("eventTypeGroups", eventTypeGroups);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventTypeGroups]);

  const updateMutation = trpc.viewer.eventTypesHeavy.update.useMutation({
    onSuccess: async (data) => {
      showToast(t("event_type_updated_successfully", { eventTypeTitle: data.eventType?.title }), "success");
    },
    async onSettled() {
      await utils.viewer.eventTypes.get.invalidate();
    },
    onError: (err) => {
      let message = "";
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }

      if (err.data?.code === "UNAUTHORIZED") {
        message = `${err.data.code}: ${t("error_event_type_unauthorized_update")}`;
      }

      if (err.data?.code === "PARSE_ERROR" || err.data?.code === "BAD_REQUEST") {
        message = `${err.data.code}: ${t(err.message)}`;
      }

      if (err.data?.code === "INTERNAL_SERVER_ERROR") {
        message = t("unexpected_error_try_again");
      }

      showToast(message ? t(message) : t(err.message), "error");
    },
  });

  const handleSelectAccount = async (teamId?: number) => {
    mutation.mutate({
      type: appMetadata.type,
      variant: appMetadata.variant,
      slug: appMetadata.slug,
      ...(teamId && { teamId }),
      // for oAuth apps
      ...(showEventTypesStep && {
        returnTo:
          WEBAPP_URL +
          getAppOnboardingUrl({
            slug: appMetadata.slug,
            teamId,
            step: AppOnboardingSteps.EVENT_TYPES_STEP,
          }),
      }),
    });
  };

  const handleSetUpLater = () => {
    router.push(`/apps/installed/${appMetadata.categories[0]}?hl=${appMetadata.slug}`);
  };

  return (
    <div
      key={pathname}
      className="dark:bg-brand dark:text-brand-contrast text-emphasis min-h-screen px-4"
      data-testid="onboarding">
      <div className="mx-auto py-6 sm:px-4 md:py-24">
        <div className="relative">
          <div className="sm:mx-auto sm:w-full sm:max-w-[600px]" ref={formPortalRef}>
            <Form
              form={formMethods}
              id="outer-event-type-form"
              handleSubmit={async (values) => {
                let mutationPromises: ReturnType<typeof updateMutation.mutateAsync>[] = [];
                for (const group of values.eventTypeGroups) {
                  const promises = group.eventTypes
                    .filter((eventType) => eventType.selected)
                    .map((value: TEventType) => {
                      if (value.metadata) {
                        const metadata = eventTypeMetaDataSchemaWithTypedApps.parse(value.metadata);
                        // Prevent two payment apps to be enabled
                        // Ok to cast type here because this metadata will be updated as the event type metadata
                        if (checkForMultiplePaymentApps(metadata))
                          throw new Error(t("event_setup_multiple_payment_apps_error"));
                        if (
                          value.metadata?.apps?.stripe?.paymentOption === "HOLD" &&
                          value.seatsPerTimeSlot
                        ) {
                          throw new Error(t("seats_and_no_show_fee_error"));
                        }
                      }

                      let updateObject: TUpdateObject = { id: value.id };
                      if (isConferencing) {
                        updateObject = {
                          ...updateObject,
                          locations: value.locations,
                          bookingFields: value.bookingFields ? value.bookingFields : undefined,
                        };
                      } else {
                        updateObject = {
                          ...updateObject,
                          metadata: value.metadata,
                        };
                      }

                      return updateMutation.mutateAsync(updateObject);
                    });
                  mutationPromises = [...mutationPromises, ...promises];
                }
                try {
                  await Promise.all(mutationPromises);
                  router.push("/event-types");
                } catch (err) {
                  console.error(err);
                }
              }}>
              <StepHeader
                title={stepObj.getTitle(appMetadata.name)}
                subtitle={stepObj.getDescription(appMetadata.name)}>
                <Steps maxSteps={maxSteps} currentStep={stepObj.stepNumber} disableNavigation />
              </StepHeader>
              {currentStep === AppOnboardingSteps.ACCOUNTS_STEP && (
                <AccountsStepCard
                  teams={teams}
                  personalAccount={personalAccount}
                  onSelect={handleSelectAccount}
                  loading={mutation.isPending}
                  installableOnTeams={installableOnTeams}
                />
              )}
              {currentStep === AppOnboardingSteps.EVENT_TYPES_STEP &&
                eventTypeGroups &&
                Boolean(eventTypeGroups?.length) && (
                  <EventTypesStepCard
                    setConfigureStep={setConfigureStep}
                    userName={userName}
                    handleSetUpLater={handleSetUpLater}
                  />
                )}
              {currentStep === AppOnboardingSteps.CONFIGURE_STEP && eventTypeGroups && (
                <ConfigureStepCard
                  slug={appMetadata.slug}
                  categories={appMetadata.categories}
                  credentialId={credentialId}
                  userName={userName}
                  loading={updateMutation.isPending}
                  formPortalRef={formPortalRef}
                  setConfigureStep={setConfigureStep}
                  eventTypeGroups={eventTypeGroups}
                  handleSetUpLater={handleSetUpLater}
                  isConferencing={isConferencing}
                />
              )}
            </Form>
          </div>
        </div>
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
};

export default OnboardingPage;
