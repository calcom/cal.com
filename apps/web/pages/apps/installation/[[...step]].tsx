import type { Prisma } from "@prisma/client";
import type { GetServerSidePropsContext } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Head from "next/head";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Toaster } from "react-hot-toast";
import { z } from "zod";

import getInstalledAppPath from "@calcom/app-store/_utils/getInstalledAppPath";
import checkForMultiplePaymentApps from "@calcom/app-store/_utils/payments/checkForMultiplePaymentApps";
import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { getLocale } from "@calcom/features/auth/lib/getLocale";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { AppOnboardingSteps } from "@calcom/lib/apps/appOnboardingSteps";
import { getAppOnboardingRedirectUrl } from "@calcom/lib/apps/getAppOnboardingRedirectUrl";
import { getAppOnboardingUrl } from "@calcom/lib/apps/getAppOnboardingUrl";
import { CAL_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import prisma from "@calcom/prisma";
import type { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import type { AppMeta } from "@calcom/types/App";
import { Form, Steps, showToast } from "@calcom/ui";

import { HttpError } from "@lib/core/http/error";

import PageWrapper from "@components/PageWrapper";
import type {
  PersonalAccountProps,
  TeamsProp,
  onSelectParams,
} from "@components/apps/installation/AccountsStepCard";
import { AccountsStepCard } from "@components/apps/installation/AccountsStepCard";
import type { ConfigureEventTypeProp } from "@components/apps/installation/ConfigureStepCard";
import { ConfigureStepCard } from "@components/apps/installation/ConfigureStepCard";
import type { EventTypeProp } from "@components/apps/installation/EventTypesStepCard";
import { EventTypesStepCard } from "@components/apps/installation/EventTypesStepCard";
import { StepFooter } from "@components/apps/installation/StepFooter";
import { StepHeader } from "@components/apps/installation/StepHeader";

type TFormType = {
  metadata: z.infer<typeof EventTypeMetaDataSchema>;
};

const STEPS = [
  AppOnboardingSteps.ACCOUNTS_STEP,
  AppOnboardingSteps.EVENT_TYPES_STEP,
  AppOnboardingSteps.CONFIGURE_STEP,
] as const;
const MAX_NUMBER_OF_STEPS = STEPS.length;

type StepType = (typeof STEPS)[number];

type StepObj = Record<
  StepType,
  {
    getTitle: (appName: string) => string;
    getDescription: (appName: string) => string;
    getStepNumber: (hasTeams: boolean, isOAuth: boolean) => number;
  }
>;

const STEPS_MAP: StepObj = {
  [AppOnboardingSteps.ACCOUNTS_STEP]: {
    getTitle: () => "Select Account",
    getDescription: (appName) => `Install ${appName} on your personal account or on a team account.`,
    getStepNumber: () => 1,
  },
  [AppOnboardingSteps.EVENT_TYPES_STEP]: {
    getTitle: () => "Select Event Type",
    getDescription: (appName) => `On which event type do you want to install ${appName}?`,
    getStepNumber: () => 2,
  },
  [AppOnboardingSteps.CONFIGURE_STEP]: {
    getTitle: (appName) => `Configure ${appName}`,
    getDescription: () => "Finalise the App setup. You can change these settings later.",
    getStepNumber: () => 3,
  },
} as const;

type OnboardingPageProps = {
  hasTeams: boolean;
  appMetadata: AppMeta;
  step: StepType;
  teams: TeamsProp;
  personalAccount: PersonalAccountProps;
  eventTypes?: EventTypeProp[];
  teamId?: number;
  eventTypeId?: number;
  userName: string;
  hasEventTypes: boolean;
  configureEventType: ConfigureEventTypeProp | null;
  credentialId?: number;
};

const OnboardingPage = ({
  hasTeams,
  step,
  teams,
  personalAccount,
  appMetadata,
  eventTypes,
  teamId,
  eventTypeId,
  userName,
  hasEventTypes,
  configureEventType,
  credentialId,
}: OnboardingPageProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const stepObj = STEPS_MAP[step];
  const nbOfSteps = MAX_NUMBER_OF_STEPS - (hasEventTypes ? 0 : 1);
  const { t } = useLocale();
  const utils = trpc.useContext();
  const [isSelectingAccount, setIsSelectingAccount] = useState(false);

  const formMethods = useForm<TFormType>({
    defaultValues: {
      metadata: configureEventType?.metadata,
    },
  });

  const updateMutation = trpc.viewer.eventTypes.update.useMutation({
    onSuccess: async () => {
      showToast(
        t("event_type_updated_successfully", { eventTypeTitle: configureEventType?.title }),
        "success"
      );
      router.push(`/event-types/${configureEventType?.id}?tabName=apps`);
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

  const handleSelectAccount = ({ id: teamId }: onSelectParams) => {
    setIsSelectingAccount(true);
    if (appMetadata.isOAuth) {
      handleOAuth(teamId);
      return;
    }

    fetch(`/api/integrations/${appMetadata.slug}/add${teamId ? `?teamId=${teamId}` : ""}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then(() => {
        router.push(
          !hasEventTypes
            ? getInstalledAppPath({ slug: appMetadata.slug, variant: appMetadata.variant })
            : getAppOnboardingUrl({
                slug: appMetadata.slug,
                step: AppOnboardingSteps.EVENT_TYPES_STEP,
                teamId,
              })
        );
      })
      .catch(() => setIsSelectingAccount(false));
  };

  const handleSelectEventType = (id: number) => {
    if (hasEventTypes) {
      router.push(
        getAppOnboardingUrl({
          slug: appMetadata.slug,
          step: AppOnboardingSteps.CONFIGURE_STEP,
          teamId: teamId,
          eventTypeId: id,
        })
      );
      return;
    }
    router.push(`/apps/installed`);
    return;
  };

  const handleOAuth = async (teamId?: number) => {
    try {
      const state = JSON.stringify({
        appOnbaordingRedirectUrl: hasEventTypes
          ? getAppOnboardingRedirectUrl(appMetadata.slug, teamId)
          : null,
        teamId,
      });

      const res = await fetch(
        `/api/integrations/${
          appMetadata.slug == "stripe" ? "stripepayment" : appMetadata.slug
        }/add?state=${state}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const oAuthUrl = (await res.json())?.url;
      router.push(oAuthUrl);
    } catch (err) {
      console.error("Error while connecting to app", appMetadata.slug);
      router.push(`/apps`);
    }
  };

  return (
    <div
      key={pathname}
      className="dark:bg-brand dark:text-brand-contrast text-emphasis min-h-screen"
      data-testid="onboarding"
      // style={
      //   {
      //     "--cal-brand": "#111827",
      //     "--cal-brand-emphasis": "#101010",
      //     "--cal-brand-text": "white",
      //     "--cal-brand-subtle": "#9CA3AF",
      //   } as CSSProperties
      // }
    >
      <Head>
        <title>Install {appMetadata?.name ?? ""}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="mx-auto py-6 sm:px-4 md:py-24">
        <div className="relative">
          <div className="sm:mx-auto sm:w-full sm:max-w-[600px]">
            <StepHeader
              title={stepObj.getTitle(appMetadata.name)}
              subtitle={stepObj.getDescription(appMetadata.name)}>
              <Steps
                maxSteps={nbOfSteps}
                currentStep={stepObj.getStepNumber(hasTeams, appMetadata.isOAuth ?? false)}
                disableNavigation
              />
            </StepHeader>
            {step === AppOnboardingSteps.ACCOUNTS_STEP && (
              <AccountsStepCard
                teams={teams}
                personalAccount={personalAccount}
                onSelect={handleSelectAccount}
                loading={isSelectingAccount}
              />
            )}
            {step === AppOnboardingSteps.EVENT_TYPES_STEP && eventTypes && Boolean(eventTypes?.length) && (
              <EventTypesStepCard
                eventTypes={eventTypes}
                onSelect={handleSelectEventType}
                userName={userName}
              />
            )}
            {step === AppOnboardingSteps.CONFIGURE_STEP && configureEventType && (
              <Form
                form={formMethods}
                handleSubmit={(values) => {
                  // Prevent two payment apps to be enabled
                  // Ok to cast type here because this metadata will be updated as the event type metadata
                  if (checkForMultiplePaymentApps(values.metadata as z.infer<typeof EventTypeMetaDataSchema>))
                    throw new Error(t("event_setup_multiple_payment_apps_error"));

                  if (
                    values.metadata?.apps?.stripe?.paymentOption === "HOLD" &&
                    configureEventType.seatsPerTimeSlot
                  ) {
                    throw new Error(t("seats_and_no_show_fee_error"));
                  }
                  updateMutation.mutate({
                    id: configureEventType.id,
                    metadata: values.metadata,
                  });
                }}>
                <ConfigureStepCard
                  slug={appMetadata.slug}
                  categories={appMetadata.categories}
                  credentialId={credentialId}
                  eventType={configureEventType}
                  loading={updateMutation.isPending}
                />
              </Form>
            )}
            <StepFooter />
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
  userWithoutTeams: "User has no teams on team step",
  noEventTypesFound: "User or teams does not have any event types",
  appNotOAuth: "App does not use OAuth",
  appNotEventType: "App does not have EventTypes",
  appNotExtendsEventType: "App does not extend EventTypes",
  userNotInTeam: "User is not in provided team",
} as const;

const getUser = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      avatar: true,
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
              logo: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error(ERROR_MESSAGES.userNotFound);
  }
  return user;
};

const getAppBySlug = async (appSlug: string) => {
  const app = await prisma.app.findUnique({
    where: { slug: appSlug, enabled: true },
    select: { slug: true, keys: true, enabled: true, dirName: true },
  });
  if (!app) throw new Error(ERROR_MESSAGES.appNotFound);
  return app;
};

const getEventTypes = async (userId: number, teamId?: number) => {
  const eventTypes = (
    await prisma.eventType.findMany({
      select: {
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
        slug: true,
      },
      where: teamId ? { teamId } : { userId },
    })
  ).sort((eventTypeA, eventTypeB) => {
    return eventTypeB.position - eventTypeA.position;
  });
  if (eventTypes.length === 0) {
    return null;
  }
  return eventTypes;
};

const getEventTypeById = async (
  eventTypeId: number,
  userId: number | undefined,
  teamId: number | undefined
) => {
  let where: Prisma.EventTypeWhereInput = { id: eventTypeId };
  if (teamId) {
    where = { ...where, teamId };
  } else if (userId) {
    where = { ...where, userId };
  }
  const eventTypeDB = await prisma.eventType.findFirst({
    select: {
      id: true,
      slug: true,
      description: true,
      users: { select: { username: true } },
      length: true,
      title: true,
      teamId: true,
      seatsPerTimeSlot: true,
      recurringEvent: true,
      team: { select: { slug: true } },
      schedulingType: true,
      metadata: true,
    },
    where,
  });

  if (!eventTypeDB) {
    throw new Error(ERROR_MESSAGES.noEventTypesFound);
  }
  return {
    ...eventTypeDB,
    URL: `${CAL_URL}/${
      eventTypeDB.team ? `team/${eventTypeDB.team.slug}` : eventTypeDB?.users?.[0]?.username
    }/${eventTypeDB.slug}`,
  } as ConfigureEventTypeProp;
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
    let eventTypes: EventTypeProp[] = [];
    let configureEventType: ConfigureEventTypeProp | null = null;
    const { req, res, query, params } = context;
    const stepsEnum = z.enum(STEPS);
    const parsedAppSlug = z.coerce.string().parse(query?.slug);
    const parsedStepParam = z.coerce.string().parse(params?.step);
    const parsedTeamIdParam = z.coerce.number().optional().parse(query?.teamId);
    const parsedEventTypeIdParam = z.coerce.number().optional().parse(query?.eventTypeId);
    const _ = stepsEnum.parse(parsedStepParam);
    const session = await getServerSession({ req, res });
    const locale = await getLocale(context.req);
    const app = await getAppBySlug(parsedAppSlug);
    const appMetadata = appStoreMetadata[app.dirName as keyof typeof appStoreMetadata];
    const hasEventTypes = appMetadata?.extendsFeature === "EventType";

    if (!session?.user?.id) throw new Error(ERROR_MESSAGES.userNotAuthed);

    const user = await getUser(session.user.id);

    const userAcceptedTeams = user.teams.map((team) => ({ ...team.team }));
    const hasTeams = Boolean(userAcceptedTeams.length);

    const appInstalls = await getAppInstallsBySlug(
      parsedAppSlug,
      user.id,
      userAcceptedTeams.map(({ id }) => id)
    );

    if (parsedTeamIdParam) {
      const isUserMemberOfTeam = userAcceptedTeams.some((team) => team.id === parsedTeamIdParam);
      if (!isUserMemberOfTeam) {
        throw new Error(ERROR_MESSAGES.userNotInTeam);
      }
    }
    if (parsedEventTypeIdParam) {
      configureEventType = await getEventTypeById(parsedEventTypeIdParam, user.id, parsedTeamIdParam);
    }

    switch (parsedStepParam) {
      case AppOnboardingSteps.EVENT_TYPES_STEP:
        if (!hasEventTypes) {
          throw new Error(ERROR_MESSAGES.appNotExtendsEventType);
        }
        const _eventTypes = await getEventTypes(user.id, parsedTeamIdParam);

        if (!_eventTypes) {
          return {
            redirect: { permanent: false, destination: `/apps/installed/${appMetadata.categories[0]}` },
          };
        }
        eventTypes = _eventTypes;
        break;

      case AppOnboardingSteps.CONFIGURE_STEP:
        if (!hasEventTypes) {
          throw new Error(ERROR_MESSAGES.appNotExtendsEventType);
        }
        if (!parsedEventTypeIdParam) {
          return {
            redirect: { permanent: false, destination: `/apps/installed/${appMetadata.categories[0]}` },
          };
        }
        break;
    }

    const personalAccount = {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      alreadyInstalled: appInstalls.some((install) => !Boolean(install.teamId) && install.userId === user.id),
    };

    const teamsWithIsAppInstalled = hasTeams
      ? userAcceptedTeams.map((team) => ({
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
    return {
      props: {
        ...(await serverSideTranslations(locale, ["common"])),
        hasTeams,
        app,
        appMetadata,
        step: parsedStepParam,
        teams: teamsWithIsAppInstalled,
        personalAccount,
        eventTypes,
        teamId: parsedTeamIdParam ?? null,
        eventTypeId: parsedEventTypeIdParam ?? null,
        userName: user.username,
        hasEventTypes,
        configureEventType,
        credentialId,
      } as OnboardingPageProps,
    };
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.info("Zod Parse Error", err.message);
      return { redirect: { permanent: false, destination: "/apps" } };
    }

    if (err instanceof Error) {
      console.info("Redirect Error", err.message);
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
