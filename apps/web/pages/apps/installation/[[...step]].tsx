import type { GetServerSidePropsContext } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Head from "next/head";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Toaster } from "react-hot-toast";
import { z } from "zod";

import checkForMultiplePaymentApps from "@calcom/app-store/_utils/payments/checkForMultiplePaymentApps";
import useAddAppMutation from "@calcom/app-store/_utils/useAddAppMutation";
import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { getLocationGroupedOptions } from "@calcom/app-store/server";
import type { EventTypeAppSettingsComponentProps, EventTypeModel } from "@calcom/app-store/types";
import { isConferencing as isConferencingApp } from "@calcom/app-store/utils";
import type { LocationObject } from "@calcom/core/location";
import { getLocale } from "@calcom/features/auth/lib/getLocale";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import type { LocationFormValues } from "@calcom/features/eventtypes/lib/types";
import { AppOnboardingSteps } from "@calcom/lib/apps/appOnboardingSteps";
import { getAppOnboardingUrl } from "@calcom/lib/apps/getAppOnboardingUrl";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { CAL_URL } from "@calcom/lib/constants";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { getTranslation } from "@calcom/lib/server";
import prisma from "@calcom/prisma";
import type { Prisma, Team } from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/enums";
import { eventTypeBookingFields } from "@calcom/prisma/zod-utils";
import type { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import type { AppMeta } from "@calcom/types/App";
import { Form, Steps, showToast } from "@calcom/ui";

import { HttpError } from "@lib/core/http/error";

import PageWrapper from "@components/PageWrapper";
import type { PersonalAccountProps } from "@components/apps/installation/AccountsStepCard";
import { AccountsStepCard } from "@components/apps/installation/AccountsStepCard";
import { ConfigureStepCard } from "@components/apps/installation/ConfigureStepCard";
import { EventTypesStepCard } from "@components/apps/installation/EventTypesStepCard";
import { StepHeader } from "@components/apps/installation/StepHeader";
import type { TLocationOptions } from "@components/eventtype/Locations";

export type TEventType = EventTypeAppSettingsComponentProps["eventType"] &
  Pick<
    EventTypeModel,
    "metadata" | "schedulingType" | "slug" | "requiresConfirmation" | "position" | "destinationCalendar"
  > & {
    selected: boolean;
    locationOptions?: TLocationOptions;
    locations: LocationFormValues["locations"];
    bookingFields?: LocationFormValues["bookingFields"];
  };

export type TEventTypeGroup = {
  teamId?: number;
  userId?: number | null;
  slug?: string | null;
  name?: string | null;
  image: string;
  eventTypes: TEventType[];
};

export type TEventTypesForm = {
  eventTypeGroups: TEventTypeGroup[];
};

const STEPS = [
  AppOnboardingSteps.ACCOUNTS_STEP,
  AppOnboardingSteps.EVENT_TYPES_STEP,
  AppOnboardingSteps.CONFIGURE_STEP,
] as const;

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
  selected?: boolean;
})[];

type OnboardingPageProps = {
  appMetadata: AppMeta;
  step: StepType;
  teams?: TTeams;
  personalAccount: PersonalAccountProps;
  eventTypes?: TEventType[];
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
      getDescription: (appName) => `${t("select_account_description", { appName })}`,
      stepNumber: 1,
    },
    [AppOnboardingSteps.EVENT_TYPES_STEP]: {
      getTitle: () => `${t("select_event_types_header")}`,
      getDescription: (appName) => `${t("select_event_types_description", { appName })}`,
      stepNumber: installableOnTeams ? 2 : 1,
    },
    [AppOnboardingSteps.CONFIGURE_STEP]: {
      getTitle: (appName) => `${t("configure_app_header", { appName })}`,
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
  const mutation = useAddAppMutation(null);

  useEffect(() => {
    eventTypeGroups && formMethods.setValue("eventTypeGroups", eventTypeGroups);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventTypeGroups]);

  const updateMutation = trpc.viewer.eventTypes.update.useMutation({
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
    mutation.mutate(
      {
        isOmniInstall: true,
        type: appMetadata.type,
        variant: appMetadata.variant,
        slug: appMetadata.slug,
        ...(teamId && { teamId }), // for oAuth apps
        ...(showEventTypesStep && {
          returnTo:
            WEBAPP_URL +
            getAppOnboardingUrl({
              slug: appMetadata.slug,
              teamId,
              step: AppOnboardingSteps.EVENT_TYPES_STEP,
            }),
        }),
      },
      {
        onSuccess: (data) => {
          if (data?.setupPending) return;
          if (showEventTypesStep) {
            // for non-oAuth apps
            router.push(
              getAppOnboardingUrl({
                slug: appMetadata.slug,
                step: AppOnboardingSteps.EVENT_TYPES_STEP,
                teamId,
              })
            );
          } else {
            router.push(`/apps/installed/${appMetadata.categories[0]}?hl=${appMetadata.slug}`);
          }
          showToast(t("app_successfully_installed"), "success");
        },
        onError: (error) => {
          if (error instanceof Error) showToast(error.message || t("app_could_not_be_installed"), "error");
        },
      }
    );
  };

  const handleSetUpLater = () => {
    router.push(`/apps/installed/${appMetadata.categories[0]}?hl=${appMetadata.slug}`);
  };

  return (
    <div
      key={pathname}
      className="dark:bg-brand dark:text-brand-contrast text-emphasis min-h-screen px-4"
      data-testid="onboarding">
      <Head>
        <title>
          {t("install")} {appMetadata?.name ?? ""}
        </title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
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
                      // Prevent two payment apps to be enabled
                      // Ok to cast type here because this metadata will be updated as the event type metadata
                      if (
                        checkForMultiplePaymentApps(value.metadata as z.infer<typeof EventTypeMetaDataSchema>)
                      )
                        throw new Error(t("event_setup_multiple_payment_apps_error"));
                      if (value.metadata?.apps?.stripe?.paymentOption === "HOLD" && value.seatsPerTimeSlot) {
                        throw new Error(t("seats_and_no_show_fee_error"));
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
              {currentStep === AppOnboardingSteps.CONFIGURE_STEP &&
                formPortalRef.current &&
                eventTypeGroups && (
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

// Redirect Error map to give context on edge cases, this is for the devs, never shown to users
const ERROR_MESSAGES = {
  appNotFound: "App not found",
  userNotAuthed: "User is not logged in",
  userNotFound: "User from session not found",
  appNotExtendsEventType: "App does not extend EventTypes",
  userNotInTeam: "User is not in provided team",
  appCredsNotFound: "App Credentials not found",
} as const;

const getUser = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      avatarUrl: true,
      name: true,
      username: true,
      teams: {
        where: {
          accepted: true,
          team: {
            members: {
              some: {
                userId,
                role: {
                  in: ["ADMIN", "OWNER"],
                },
              },
            },
          },
        },
        select: {
          team: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              isOrganization: true,
              parent: {
                select: {
                  logoUrl: true,
                  name: true,
                  id: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error(ERROR_MESSAGES.userNotFound);
  }

  let teams = user.teams.map(({ team }) => ({
    ...team,
    logoUrl: team.parent
      ? getPlaceholderAvatar(team.parent.logoUrl, team.parent.name)
      : getPlaceholderAvatar(team.logoUrl, team.name),
  }));
  const orgTeam = teams.find((team) => team.isOrganization === true);
  if (orgTeam?.id) {
    teams = teams.filter((team) => team?.parent?.id !== orgTeam.id);
  }
  return {
    ...user,
    teams,
  };
};
const getOrgSubTeams = async (parentId: number) => {
  const teams = await prisma.team.findMany({
    where: {
      parentId,
    },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      isOrganization: true,
      parent: {
        select: {
          logoUrl: true,
          name: true,
          id: true,
        },
      },
    },
  });
  return teams.map((team) => ({
    ...team,
    selected: false,
    logoUrl: team.parent
      ? getPlaceholderAvatar(team.parent.logoUrl, team.parent.name)
      : getPlaceholderAvatar(team.logoUrl, team.name),
  }));
};

const getAppBySlug = async (appSlug: string) => {
  const app = await prisma.app.findUnique({
    where: { slug: appSlug, enabled: true },
    select: { slug: true, keys: true, enabled: true, dirName: true },
  });
  if (!app) throw new Error(ERROR_MESSAGES.appNotFound);
  return app;
};

const getEventTypes = async (userId: number, teamIds?: number[]) => {
  const eventTypeSelect: Prisma.EventTypeSelect = {
    id: true,
    description: true,
    durationLimits: true,
    metadata: true,
    length: true,
    title: true,
    position: true,
    recurringEvent: true,
    requiresConfirmation: true,
    team: { select: { slug: true } },
    schedulingType: true,
    teamId: true,
    users: { select: { username: true } },
    seatsPerTimeSlot: true,
    slug: true,
    locations: true,
    userId: true,
    destinationCalendar: true,
    bookingFields: true,
  };
  let eventTypeGroups: TEventTypeGroup[] | null = [];

  if (teamIds && teamIds.length > 0) {
    const teams = await prisma.team.findMany({
      where: {
        id: {
          in: teamIds,
        },
      },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        slug: true,
        eventTypes: {
          select: eventTypeSelect,
        },
      },
    });
    eventTypeGroups = teams.map((team) => ({
      teamId: team.id,
      slug: team.slug,
      name: team.name,
      image: getPlaceholderAvatar(team.logoUrl, team.name),
      eventTypes: team.eventTypes
        .map((item) => ({
          ...item,
          URL: `${CAL_URL}/${item.team ? `team/${item.team.slug}` : item?.users?.[0]?.username}/${item.slug}`,
          selected: false,
          locations: item.locations as unknown as LocationObject[],
          bookingFields: eventTypeBookingFields.parse(item.bookingFields || []),
        }))
        .sort((eventTypeA, eventTypeB) => eventTypeB.position - eventTypeA.position),
    }));
  } else {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
      },
      select: {
        id: true,
        username: true,
        name: true,
        avatarUrl: true,
        eventTypes: {
          select: eventTypeSelect,
        },
      },
    });
    if (user) {
      eventTypeGroups.push({
        userId: user.id,
        slug: user.username,
        name: user.name,
        image: getPlaceholderAvatar(user.avatarUrl, user.name),
        eventTypes: user.eventTypes
          .map((item) => ({
            ...item,
            URL: `${CAL_URL}/${item.team ? `team/${item.team.slug}` : item?.users?.[0]?.username}/${
              item.slug
            }`,
            selected: false,
            locations: item.locations as unknown as LocationObject[],
            bookingFields: eventTypeBookingFields.parse(item.bookingFields || []),
          }))
          .sort((eventTypeA, eventTypeB) => eventTypeB.position - eventTypeA.position),
      });
    }
  }
  return eventTypeGroups;
};

const getAppInstallsBySlug = async (appSlug: string, userId: number, teamIds?: number[]) => {
  const appInstalls = await prisma.credential.findMany({
    where: {
      OR: [
        {
          appId: appSlug,
          userId: userId,
        },
        teamIds && Boolean(teamIds.length)
          ? {
              appId: appSlug,
              teamId: { in: teamIds },
            }
          : {},
      ],
    },
  });
  return appInstalls;
};

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  try {
    const { req, res, query, params } = context;
    let eventTypeGroups: TEventTypeGroup[] | null = null;
    let isOrg = false;
    const stepsEnum = z.enum(STEPS);
    const parsedAppSlug = z.coerce.string().parse(query?.slug);
    const parsedStepParam = z.coerce.string().parse(params?.step);
    const parsedTeamIdParam = z.coerce.number().optional().parse(query?.teamId);
    const _ = stepsEnum.parse(parsedStepParam);
    const session = await getServerSession({ req, res });
    const locale = await getLocale(context.req);
    const app = await getAppBySlug(parsedAppSlug);
    const appMetadata = appStoreMetadata[app.dirName as keyof typeof appStoreMetadata];
    const extendsEventType = appMetadata?.extendsFeature === "EventType";

    const isConferencing = isConferencingApp(appMetadata.categories);
    const showEventTypesStep = extendsEventType || isConferencing;

    if (!session?.user?.id) throw new Error(ERROR_MESSAGES.userNotAuthed);

    const user = await getUser(session.user.id);

    let userTeams = user.teams;
    const hasTeams = Boolean(userTeams.length);

    if (parsedTeamIdParam) {
      const currentTeam = userTeams.find((team) => team.id === parsedTeamIdParam);
      if (!currentTeam?.id) {
        throw new Error(ERROR_MESSAGES.userNotInTeam);
      }
      if (currentTeam.isOrganization) {
        const subTeams = await getOrgSubTeams(parsedTeamIdParam);
        userTeams = [...userTeams, ...subTeams];
        isOrg = true;
      }
    }

    if (parsedStepParam == AppOnboardingSteps.EVENT_TYPES_STEP) {
      if (!showEventTypesStep) {
        return {
          redirect: {
            permanent: false,
            destination: `/apps/installed/${appMetadata.categories[0]}?hl=${appMetadata.slug}`,
          },
        };
      }
      if (isOrg) {
        const teamIds = userTeams.map((item) => item.id);
        eventTypeGroups = await getEventTypes(user.id, teamIds);
      } else if (parsedTeamIdParam) {
        eventTypeGroups = await getEventTypes(user.id, [parsedTeamIdParam]);
      } else {
        eventTypeGroups = await getEventTypes(user.id);
      }
      if (isConferencing && eventTypeGroups) {
        const t = await getTranslation(locale ?? "en", "common");
        const locationOptions = await getLocationGroupedOptions({ userId: user.id }, t);
        for (let groupIndex = 0; groupIndex < eventTypeGroups.length; groupIndex++) {
          for (let eventIndex = 0; eventIndex < eventTypeGroups[groupIndex].eventTypes.length; eventIndex++) {
            let eventType = eventTypeGroups[groupIndex].eventTypes[eventIndex];
            let destinationCalendar = eventType.destinationCalendar;
            if (!destinationCalendar) {
              destinationCalendar = await prisma.destinationCalendar.findFirst({
                where: {
                  userId: user.id,
                  eventTypeId: null,
                },
              });
              eventType = { ...eventType, destinationCalendar };
            }
            if (eventType.schedulingType === SchedulingType.MANAGED) {
              eventType = {
                ...eventType,
                locationOptions: [
                  {
                    label: t("default"),
                    options: [
                      {
                        label: t("members_default_location"),
                        value: "",
                        icon: "/user-check.svg",
                      },
                    ],
                  },
                  ...locationOptions,
                ],
              };
            } else {
              eventType = { ...eventType, locationOptions };
            }
            eventTypeGroups[groupIndex].eventTypes[eventIndex] = eventType;
          }
        }
      }
    }

    const appInstalls = await getAppInstallsBySlug(
      parsedAppSlug,
      user.id,
      userTeams.map(({ id }) => id)
    );

    const personalAccount = {
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl,
      alreadyInstalled: appInstalls.some((install) => !Boolean(install.teamId) && install.userId === user.id),
    };

    const teamsWithIsAppInstalled = hasTeams
      ? userTeams.map((team) => ({
          ...team,
          alreadyInstalled: appInstalls.some(
            (install) => Boolean(install.teamId) && install.teamId === team.id
          ),
        }))
      : [];
    let credentialId = null;
    if (parsedTeamIdParam) {
      credentialId =
        appInstalls.find((item) => !!item.teamId && item.teamId == parsedTeamIdParam)?.id ?? null;
    } else {
      credentialId = appInstalls.find((item) => !!item.userId && item.userId == user.id)?.id ?? null;
    }
    // dont allow app installation without cretendialId
    if (parsedStepParam == AppOnboardingSteps.EVENT_TYPES_STEP && !credentialId) {
      throw new Error(ERROR_MESSAGES.appCredsNotFound);
    }

    return {
      props: {
        ...(await serverSideTranslations(locale, ["common"])),
        app,
        appMetadata,
        showEventTypesStep,
        step: parsedStepParam,
        teams: teamsWithIsAppInstalled,
        personalAccount,
        eventTypeGroups,
        teamId: parsedTeamIdParam ?? null,
        userName: user.username,
        credentialId,
        isConferencing,
        isOrg,
        // conferencing apps dont support team install
        installableOnTeams: !isConferencing,
      } as OnboardingPageProps,
    };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { redirect: { permanent: false, destination: "/apps" } };
    }

    if (err instanceof Error) {
      switch (err.message) {
        case ERROR_MESSAGES.userNotAuthed:
          return { redirect: { permanent: false, destination: "/auth/login" } };
        case ERROR_MESSAGES.userNotFound:
          return { redirect: { permanent: false, destination: "/auth/login" } };
        default:
          return { redirect: { permanent: false, destination: "/apps" } };
      }
    }
  }
};

OnboardingPage.PageWrapper = PageWrapper;

export default OnboardingPage;
