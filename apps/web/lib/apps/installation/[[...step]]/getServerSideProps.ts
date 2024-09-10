import type { Prisma } from "@prisma/client";
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
import { UserRepository } from "@calcom/lib/server/repository/user";
import prisma from "@calcom/prisma";
import { eventTypeBookingFields } from "@calcom/prisma/zod-utils";

import { STEPS } from "~/apps/installation/[[...step]]/constants";
import type { OnboardingPageProps, TEventTypeGroup } from "~/apps/installation/[[...step]]/step-view";

const getUser = async (userId: number) => {
  const userAdminTeams = await UserRepository.getUserAdminTeams(userId);

  if (!userAdminTeams?.id) {
    return null;
  }

  let teams = userAdminTeams.teams.map(({ team }) => ({
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
    ...userAdminTeams,
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
        isOrganization: false,
      },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        slug: true,
        isOrganization: true,
        eventTypes: {
          select: eventTypeSelect,
        },
      },
    });
    eventTypeGroups = teams.map((team) => ({
      teamId: team.id,
      slug: team.slug,
      name: team.name,
      isOrganisation: team.isOrganization,
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
          where: {
            teamId: null,
          },
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
  const { req, res, query, params } = context;
  let eventTypeGroups: TEventTypeGroup[] | null = null;
  let isOrg = false;
  const stepsEnum = z.enum(STEPS);
  const parsedAppSlug = z.coerce.string().parse(query?.slug);
  const parsedStepParam = z.coerce.string().parse(params?.step);
  const parsedTeamIdParam = z.coerce.number().optional().parse(query?.teamId);
  const _ = stepsEnum.parse(parsedStepParam);
  const session = await getServerSession({ req, res });
  if (!session?.user?.id) return { redirect: { permanent: false, destination: "/auth/login" } };
  const locale = await getLocale(context.req);
  const app = await getAppBySlug(parsedAppSlug);
  if (!app) return { redirect: { permanent: false, destination: "/apps" } };
  const appMetadata = appStoreMetadata[app.dirName as keyof typeof appStoreMetadata];
  const extendsEventType = appMetadata?.extendsFeature === "EventType";

  const isConferencing = isConferencingApp(appMetadata.categories);
  const showEventTypesStep = extendsEventType || isConferencing;

  const user = await getUser(session.user.id);
  if (!user) return { redirect: { permanent: false, destination: "/apps" } };

  let userTeams = user.teams;
  const hasTeams = Boolean(userTeams.length);

  if (parsedTeamIdParam) {
    const currentTeam = userTeams.find((team) => team.id === parsedTeamIdParam);
    if (!currentTeam?.id) {
      return { redirect: { permanent: false, destination: "/apps" } };
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
      const destinationCalendar = await prisma.destinationCalendar.findFirst({
        where: {
          userId: user.id,
          eventTypeId: null,
        },
      });

      eventTypeGroups.forEach((group) => {
        group.eventTypes = group.eventTypes.map((eventType) => {
          if (!eventType.destinationCalendar) {
            return { ...eventType, destinationCalendar };
          }
          return eventType;
        });
      });
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
    credentialId = appInstalls.find((item) => !!item.teamId && item.teamId == parsedTeamIdParam)?.id ?? null;
  } else {
    credentialId = appInstalls.find((item) => !!item.userId && item.userId == user.id)?.id ?? null;
  }
  // dont allow app installation without cretendialId
  if (parsedStepParam == AppOnboardingSteps.EVENT_TYPES_STEP && !credentialId) {
    return { redirect: { permanent: false, destination: "/apps" } };
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
};
