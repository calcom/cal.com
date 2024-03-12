import type { GetServerSidePropsContext } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Head from "next/head";
import { usePathname, useRouter } from "next/navigation";
import { useState, type CSSProperties } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";

import getInstalledAppPath from "@calcom/app-store/_utils/getInstalledAppPath";
import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { getLocale } from "@calcom/features/auth/lib/getLocale";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { CAL_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import prisma from "@calcom/prisma";
import type { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import type { AppMeta } from "@calcom/types/App";
import { Steps, showToast } from "@calcom/ui";

import { HttpError } from "@lib/core/http/error";

import PageWrapper from "@components/PageWrapper";
import type {
  PersonalAccountProps,
  TeamsProp,
  onSelectParams,
} from "@components/apps/onboarding/AccountsStepCard";
import { AccountsStepCard } from "@components/apps/onboarding/AccountsStepCard";
import type { ConfigureEventTypeProp } from "@components/apps/onboarding/ConfigureStepCard";
import { ConfigureStepCard } from "@components/apps/onboarding/ConfigureStepCard";
import type { EventTypeProp } from "@components/apps/onboarding/EventTypesStepCard";
import { EventTypesStepCard } from "@components/apps/onboarding/EventTypesStepCard";
import { OAuthStepCard } from "@components/apps/onboarding/OAuthStepCard";
import { StepFooter } from "@components/apps/onboarding/StepFooter";
import { StepHeader } from "@components/apps/onboarding/StepHeader";

const ACCOUNTS_STEP = "accounts";
const OAUTH_STEP = "connect";
const EVENT_TYPES_STEP = "event-types";
const CONFIGURE_STEP = "configure";
type TFormType = {
  metadata: z.infer<typeof EventTypeMetaDataSchema>;
};

const STEPS = [ACCOUNTS_STEP, OAUTH_STEP, EVENT_TYPES_STEP, CONFIGURE_STEP] as const;
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
  [ACCOUNTS_STEP]: {
    getTitle: () => "Select Account",
    getDescription: (appName) => `Install ${appName} on your personal account or on a team account.`,
    getStepNumber: (hasTeams) => (hasTeams ? 1 : 0),
  },
  [OAUTH_STEP]: {
    getTitle: (appName) => `Install ${appName}`,
    getDescription: (appName) => `Give permissions to connect your Cal.com to ${appName}.`,
    getStepNumber: (hasTeams, isOAuth) => (hasTeams ? 1 : 0) + (isOAuth ? 1 : 0),
  },
  [EVENT_TYPES_STEP]: {
    getTitle: () => "Select Event Type",
    getDescription: (appName) => `On which event type do you want to install ${appName}?`,
    getStepNumber: (hasTeams, isOAuth) => 1 + (hasTeams ? 1 : 0) + (isOAuth ? 1 : 0),
  },
  [CONFIGURE_STEP]: {
    getTitle: (appName) => `Configure ${appName}`,
    getDescription: () => "Finalise the App setup. You can change these settings later.",
    getStepNumber: (hasTeams, isOAuth) => 2 + (hasTeams ? 1 : 0) + (isOAuth ? 1 : 0),
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
  userName: string;
  hasEventTypes: boolean;
  configureEventType: ConfigureEventTypeProp | null;
  credentialId?: number;
};

const getRedirectUrl = (slug: string, step: StepType, teamId?: number, eventTypeId?: number) => {
  return `/apps/onboarding/${step}?slug=${slug}${teamId ? `&teamId=${teamId}` : ""}${
    eventTypeId ? `&eventTypeId=${eventTypeId}` : ""
  }`;
};

const OnboardingPage = ({
  hasTeams,
  step,
  teams,
  personalAccount,
  appMetadata,
  eventTypes,
  teamId,
  userName,
  hasEventTypes,
  configureEventType,
  credentialId,
}: OnboardingPageProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const stepObj = STEPS_MAP[step];
  const nbOfSteps =
    MAX_NUMBER_OF_STEPS - (hasTeams ? 0 : 1) - (appMetadata.isOAuth ? 0 : 1) - (hasEventTypes ? 0 : 1);
  const { t } = useLocale();
  const [isLoadingOAuth, setIsLoadingOAuth] = useState(false);
  const utils = trpc.useContext();
  const [isSelectingAccount, setIsSelectingAccount] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const methods = useForm<TFormType>({
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
      setIsSaving(false);
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
      router.push(getRedirectUrl(appMetadata.slug, OAUTH_STEP, teamId));
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
            : getRedirectUrl(appMetadata.slug, EVENT_TYPES_STEP, teamId)
        );
      })
      .catch(() => setIsSelectingAccount(false));
  };

  const handleSelectEventType = (id: number) => {
    if (hasEventTypes) {
      router.push(getRedirectUrl(appMetadata.slug, CONFIGURE_STEP, teamId, id));
      return;
    }
    router.push(`/apps/installed`);
    return;
  };

  const handleOAuth = async () => {
    try {
      setIsLoadingOAuth(true);
      const state = JSON.stringify({
        returnToOnboarding: hasEventTypes,
        teamId: teamId,
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
      setIsLoadingOAuth(false);
    }
  };

  const handleSaveSettings = () => {
    if (configureEventType) {
      setIsSaving(true);
      const metadata = methods.getValues("metadata");
      updateMutation.mutate({
        id: configureEventType.id,
        metadata,
      });
    }
    // console.log("SAVE THIS DATA IN EVENT TYPE", data);
    // redirect to event type settings, advanced tab -> apps
    return;
  };

  return (
    <div
      key={pathname}
      className="dark:bg-brand dark:text-brand-contrast text-emphasis min-h-screen"
      data-testid="onboarding"
      style={
        {
          "--cal-brand": "#111827",
          "--cal-brand-emphasis": "#101010",
          "--cal-brand-text": "white",
          "--cal-brand-subtle": "#9CA3AF",
        } as CSSProperties
      }>
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
            {step === ACCOUNTS_STEP && (
              <AccountsStepCard
                teams={teams}
                personalAccount={personalAccount}
                onSelect={handleSelectAccount}
                loading={isSelectingAccount}
              />
            )}
            {step === OAUTH_STEP && (
              <OAuthStepCard
                description={appMetadata.description}
                name={appMetadata.name}
                logo={appMetadata.logo}
                onClick={handleOAuth}
                isLoading={isLoadingOAuth}
              />
            )}
            {step === EVENT_TYPES_STEP && eventTypes && Boolean(eventTypes?.length) && (
              <EventTypesStepCard
                eventTypes={eventTypes}
                onSelect={handleSelectEventType}
                userName={userName}
              />
            )}
            {step === CONFIGURE_STEP && configureEventType && (
              // Find solution for this, should not have to use FormProvider
              <FormProvider {...methods}>
                <ConfigureStepCard
                  slug={appMetadata.slug}
                  categories={appMetadata.categories}
                  credentialId={credentialId}
                  eventType={configureEventType}
                  onSave={handleSaveSettings}
                  loading={isSaving}
                />
              </FormProvider>
            )}
            <StepFooter />
          </div>
        </div>
      </div>
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
        select: {
          accepted: true,
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
    throw new Error(ERROR_MESSAGES.noEventTypesFound);
  }
  return eventTypes;
};

const getEventTypeById = async (eventTypeId: number) => {
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
    where: { id: eventTypeId },
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
    const hasEventTypes = appMetadata.extendsFeature === "EventType";

    if (!session?.user?.id) throw new Error(ERROR_MESSAGES.userNotAuthed);

    const user = await getUser(session.user.id);

    const userAcceptedTeams = user.teams
      .filter((team) => team.accepted)
      .map((team) => ({ ...team.team, accepted: team.accepted }));
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

    switch (parsedStepParam) {
      case ACCOUNTS_STEP:
        if (!hasTeams) {
          throw new Error(ERROR_MESSAGES.userWithoutTeams);
        }
        break;

      case EVENT_TYPES_STEP:
        if (!hasEventTypes) {
          throw new Error(ERROR_MESSAGES.appNotExtendsEventType);
        }
        eventTypes = await getEventTypes(user.id, parsedTeamIdParam);
        break;

      case CONFIGURE_STEP:
        if (!hasEventTypes) {
          throw new Error(ERROR_MESSAGES.appNotExtendsEventType);
        }
        if (!parsedEventTypeIdParam) {
          throw new Error(ERROR_MESSAGES.appNotEventType);
        }
        configureEventType = await getEventTypeById(parsedEventTypeIdParam);
        break;

      case OAUTH_STEP:
        if (!appMetadata.isOAuth) {
          throw new Error(ERROR_MESSAGES.appNotOAuth);
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
        userName: user.username,
        hasEventTypes,
        configureEventType,
        credentialId: parsedTeamIdParam ? teamsWithIsAppInstalled[0]?.id ?? null : appInstalls[0]?.id ?? null,
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

OnboardingPage.isThemeSupported = false;
OnboardingPage.PageWrapper = PageWrapper;

export default OnboardingPage;
