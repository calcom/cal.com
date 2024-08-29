import type { GetServerSidePropsContext } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { z } from "zod";

import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { isConferencing as isConferencingApp } from "@calcom/app-store/utils";
import type { LocationObject } from "@calcom/core/location";
import { getLocale } from "@calcom/features/auth/lib/getLocale";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { AppOnboardingSteps } from "@calcom/lib/apps/appOnboardingSteps";
import { CAL_URL } from "@calcom/lib/constants";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import prisma from "@calcom/prisma";
import { eventTypeBookingFields } from "@calcom/prisma/zod-utils";

import type { OnboardingPageProps, TEventType } from "~/apps/installation/[[...step]]/step-view";
import { STEPS } from "~/apps/installation/[[...step]]/step-view";

// Redirect Error map to give context on edge cases, this is for the devs, never shown to users
const ERROR_MESSAGES = {
  appNotFound: "App not found",
  userNotAuthed: "User is not logged in",
  userNotFound: "User from session not found",
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
              parent: {
                select: {
                  logoUrl: true,
                  name: true,
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

  const teams = user.teams.map(({ team }) => ({
    ...team,
    logoUrl: team.parent
      ? getPlaceholderAvatar(team.parent.logoUrl, team.parent.name)
      : getPlaceholderAvatar(team.logoUrl, team.name),
  }));
  return {
    ...user,
    teams,
  };
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
        schedulingType: true,
        teamId: true,
        users: { select: { username: true } },
        seatsPerTimeSlot: true,
        slug: true,
        locations: true,
        userId: true,
        destinationCalendar: true,
        bookingFields: true,
      },
      /**
       * filter out managed events for now
       *  @todo: can install apps to managed event types
       */
      where: teamId ? { teamId } : { userId, parent: null, teamId: null },
    })
  ).sort((eventTypeA, eventTypeB) => {
    return eventTypeB.position - eventTypeA.position;
  });

  if (eventTypes.length === 0) {
    return [];
  }

  return eventTypes.map((item) => ({
    ...item,
    URL: `${CAL_URL}/${item.team ? `team/${item.team.slug}` : item?.users?.[0]?.username}/${item.slug}`,
    selected: false,
    locations: item.locations as unknown as LocationObject[],
    bookingFields: eventTypeBookingFields.parse(item.bookingFields || []),
  }));
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
    let eventTypes: TEventType[] | null = null;
    const { req, res, query, params } = context;
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
    console.log("sshowEventTypesStephowEventTypesStep: ", showEventTypesStep);

    if (!session?.user?.id) throw new Error(ERROR_MESSAGES.userNotAuthed);

    const user = await getUser(session.user.id);

    const userTeams = user.teams;
    const hasTeams = Boolean(userTeams.length);

    const appInstalls = await getAppInstallsBySlug(
      parsedAppSlug,
      user.id,
      userTeams.map(({ id }) => id)
    );

    if (parsedTeamIdParam) {
      const isUserMemberOfTeam = userTeams.some((team) => team.id === parsedTeamIdParam);
      if (!isUserMemberOfTeam) {
        throw new Error(ERROR_MESSAGES.userNotInTeam);
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
      eventTypes = await getEventTypes(user.id, parsedTeamIdParam);
      if (isConferencing) {
        const destinationCalendar = await prisma.destinationCalendar.findFirst({
          where: {
            userId: user.id,
            eventTypeId: null,
          },
        });
        for (let index = 0; index < eventTypes.length; index++) {
          let eventType = eventTypes[index];
          if (!eventType.destinationCalendar) {
            eventType = { ...eventType, destinationCalendar };
          }
          eventTypes[index] = eventType;
        }
      }

      if (eventTypes.length === 0) {
        return {
          redirect: {
            permanent: false,
            destination: `/apps/installed/${appMetadata.categories[0]}?hl=${appMetadata.slug}`,
          },
        };
      }
    }

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
    return {
      props: {
        ...(await serverSideTranslations(locale, ["common"])),
        app,
        appMetadata,
        showEventTypesStep,
        step: parsedStepParam,
        teams: teamsWithIsAppInstalled,
        personalAccount,
        eventTypes,
        teamId: parsedTeamIdParam ?? null,
        userName: user.username,
        credentialId,
        isConferencing,
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
    } else {
      return { redirect: { permanent: false, destination: "/apps" } };
    }
  }
};
