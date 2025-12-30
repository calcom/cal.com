import { getDefaultAvatar } from "@calid/features/lib/defaultAvatar";
import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { isConferencing as isConferencingApp } from "@calcom/app-store/utils";
import { getLocale } from "@calcom/features/auth/lib/getLocale";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { AppOnboardingSteps } from "@calcom/lib/apps/appOnboardingSteps";
import { CAL_URL } from "@calcom/lib/constants";
import type { LocationObject } from "@calcom/lib/location";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { eventTypeBookingFields } from "@calcom/prisma/zod-utils";

import { STEPS } from "~/apps/installation/[[...step]]/constants";
import type { OnboardingPageProps, TEventTypeGroup } from "~/apps/installation/[[...step]]/step-view";

const getUser = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      username: true,
    },
  });

  if (!user) {
    return null;
  }

  // Get calIdTeams where user is a member
  const calIdMemberships = await prisma.calIdMembership.findMany({
    where: {
      userId: userId,
      acceptedInvitation: true,
      OR: [{ role: "ADMIN" }, { role: "OWNER" }],
    },
    include: {
      calIdTeam: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          slug: true,
        },
      },
    },
  });

  const calIdTeams = calIdMemberships.map(({ calIdTeam }) => ({
    ...calIdTeam,
    logoUrl: getDefaultAvatar(calIdTeam.logoUrl, calIdTeam.name),
  }));

  return {
    ...user,
    calIdTeams,
  };
};

const getAppBySlug = async (appSlug: string) => {
  const app = await prisma.app.findUnique({
    where: { slug: appSlug, enabled: true },
    select: { slug: true, keys: true, enabled: true, dirName: true },
  });
  return app;
};

const getEventTypes = async (userId: number, calIdTeamIds?: number[]) => {
  const eventTypeSelect = {
    id: true,
    description: true,
    durationLimits: true,
    metadata: true,
    length: true,
    title: true,
    position: true,
    recurringEvent: true,
    requiresConfirmation: true,
    canSendCalVideoTranscriptionEmails: true,
    calIdTeam: { select: { slug: true } },
    schedulingType: true,
    calIdTeamId: true,
    users: { select: { username: true } },
    seatsPerTimeSlot: true,
    slug: true,
    locations: true,
    userId: true,
    destinationCalendar: true,
    bookingFields: true,
    calVideoSettings: true,
  } satisfies Prisma.EventTypeSelect;

  let eventTypeGroups: TEventTypeGroup[] | null = [];

  if (calIdTeamIds && calIdTeamIds.length > 0) {
    const calIdTeams = await prisma.calIdTeam.findMany({
      where: {
        id: {
          in: calIdTeamIds,
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

    eventTypeGroups = calIdTeams.map((team) => ({
      teamId: team.id,
      slug: team.slug,
      name: team.name,
      isOrganisation: false, // calIdTeams are not organizations
      image: getDefaultAvatar(team.logoUrl, team.name),
      eventTypes: team.eventTypes
        .map((item) => ({
          ...item,
          URL: `${CAL_URL}/${team.slug}/${item.slug}`,
          selected: false,
          locations: item.locations as unknown as LocationObject[],
          bookingFields: eventTypeBookingFields.parse(item.bookingFields || []),
        }))
        .sort((eventTypeA, eventTypeB) => eventTypeB.position - eventTypeA.position),
    }));
  } else {
    const user = await prisma.user.findUnique({
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
        image: getDefaultAvatar(user.avatarUrl, user.name),
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

const getAppInstallsBySlug = async (appSlug: string, userId: number, calIdTeamIds?: number[]) => {
  const appInstalls = await prisma.credential.findMany({
    where: {
      OR: [
        {
          appId: appSlug,
          userId: userId,
        },
        calIdTeamIds && Boolean(calIdTeamIds.length)
          ? {
              appId: appSlug,
              calIdTeamId: { in: calIdTeamIds },
            }
          : {},
      ],
    },
  });
  return appInstalls;
};

export const getCalIdServerSideProps = async (context: GetServerSidePropsContext) => {
  const { req, query, params } = context;
  let eventTypeGroups: TEventTypeGroup[] | null = null;
  const isOrg = false;
  const stepsEnum = z.enum(STEPS);
  const parsedAppSlug = z.coerce.string().parse(query?.slug);
  const parsedStepParam = z.coerce.string().parse(params?.step);
  const parsedCalIdTeamIdParam = z.coerce.number().optional().parse(query?.calIdTeamId);
  const _ = stepsEnum.parse(parsedStepParam);
  const session = await getServerSession({ req });
  if (!session?.user?.id) return { redirect: { permanent: false, destination: "/auth/login" } };
  const locale = await getLocale(context.req);
  const app = await getAppBySlug(parsedAppSlug);
  if (!app) return { redirect: { permanent: false, destination: "/apps" } };
  const appMetadata = appStoreMetadata[app.dirName as keyof typeof appStoreMetadata];
  const extendsEventType = appMetadata?.extendsFeature === "EventType";

  const allowedMultipleInstalls =
    // Calendar apps never show account screen so skipping this check. // (appMetadata.categories.indexOf("calendar") > -1 && appMetadata.variant !== "other") ||
    appMetadata.slug === "whatsapp-business";

  const isConferencing = isConferencingApp(appMetadata.categories);

  const noTeamsOnAccountsPage = ["make", "zapier", "viasocket"].includes(appMetadata.slug);

  const showEventTypesStep = extendsEventType || isConferencing;

  const user = await getUser(session.user.id);
  if (!user) return { redirect: { permanent: false, destination: "/apps" } };

  const userCalIdTeams = user.calIdTeams;
  const hasCalIdTeams = Boolean(userCalIdTeams.length);

  if (parsedCalIdTeamIdParam) {
    const currentCalIdTeam = userCalIdTeams.find((team) => team.id === parsedCalIdTeamIdParam);
    if (!currentCalIdTeam?.id) {
      return { redirect: { permanent: false, destination: "/apps" } };
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
      const calIdTeamIds = userCalIdTeams.map((item) => item.id);
      eventTypeGroups = await getEventTypes(user.id, calIdTeamIds);
    } else if (parsedCalIdTeamIdParam) {
      eventTypeGroups = await getEventTypes(user.id, [parsedCalIdTeamIdParam]);
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
    userCalIdTeams.map(({ id }) => id)
  );

  const personalAccount = {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
    allowedMultipleInstalls,
    alreadyInstalled: appInstalls.some(
      (install) => !Boolean(install.calIdTeamId) && install.userId === user.id
    ),
  };

  const calIdTeamsWithIsAppInstalled = hasCalIdTeams
    ? userCalIdTeams.map((team) => ({
        ...team,
        allowedMultipleInstalls,
        alreadyInstalled: appInstalls.some(
          (install) => Boolean(install.calIdTeamId) && install.calIdTeamId === team.id
        ),
      }))
    : [];

  let credentialId = null;
  if (parsedCalIdTeamIdParam) {
    credentialId =
      appInstalls.find((item) => !!item.calIdTeamId && item.calIdTeamId == parsedCalIdTeamIdParam)?.id ??
      null;
  } else {
    credentialId = appInstalls.find((item) => !!item.userId && item.userId == user.id)?.id ?? null;
  }

  // dont allow app installation without credentialId
  if (parsedStepParam == AppOnboardingSteps.EVENT_TYPES_STEP && !credentialId) {
    return { redirect: { permanent: false, destination: "/apps" } };
  }

  return {
    props: {
      app,
      appMetadata,
      showEventTypesStep,
      step: parsedStepParam,
      teams: calIdTeamsWithIsAppInstalled,
      personalAccount,
      eventTypeGroups,
      calIdTeamId: parsedCalIdTeamIdParam ?? null,
      userName: user.username,
      credentialId,
      isConferencing,
      isOrg,
      // conferencing apps dont support team install
      installableOnTeams: !isConferencing,
      noTeamsOnAccountsPage,
    } as OnboardingPageProps,
  };
};
