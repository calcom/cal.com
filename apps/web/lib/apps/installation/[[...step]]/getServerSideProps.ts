import type { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import { z } from "zod";

import { createDefaultInstallation } from "@calcom/app-store/_utils/installation";
import { filterEventTypesWhereLocationUpdateIsAllowed } from "@calcom/app-store/_utils/getBulkEventTypes";
import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import type { LocationObject } from "@calcom/app-store/locations";
import { isConferencing as isConferencingApp } from "@calcom/app-store/utils";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { AppOnboardingSteps } from "@calcom/lib/apps/appOnboardingSteps";
import { CAL_URL } from "@calcom/lib/constants";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import prisma from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";
import { eventTypeBookingFields } from "@calcom/prisma/zod-utils";

import { STEPS } from "../../../../modules/apps/installation/[[...step]]/constants";
import type {
  OnboardingPageProps,
  TEventTypeGroup,
  TEventType,
} from "../../../../modules/apps/installation/[[...step]]/step-view";

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
  canSendCalVideoTranscriptionEmails: true,
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
  calVideoSettings: true,
  parentId: true,
};

type EventTypeFromDb = Prisma.EventTypeGetPayload<{
  select: typeof eventTypeSelect;
}>;

type MinimalUser = {
  id: number;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
};

type MinimalTeam = {
  id: number;
  name: string;
  logoUrl: string | null;
  isOrganization: boolean;
};

type RedirectResult = { redirect: { permanent: boolean; destination: string } };

const mapEventType = (item: EventTypeFromDb): TEventType => {
  let teamSlug = "";
  if (item.team) {
    teamSlug = `team/${item.team.slug}`;
  }
  const userSlug = item?.users?.[0]?.username;
  let urlPart = userSlug;
  if (teamSlug) {
    urlPart = teamSlug;
  }

  return {
    ...item,
    URL: `${CAL_URL}/${urlPart}/${item.slug}`,
    selected: false,
    locations: item.locations as unknown as LocationObject[],
    bookingFields: eventTypeBookingFields.parse(item.bookingFields || []),
  };
};

const getUser = async (
  userId: number
): Promise<
  | (MinimalUser & {
      teams: {
        id: number;
        name: string;
        logoUrl: string | null;
        isOrganization: boolean;
        parent: { id: number; name: string; logoUrl: string | null } | null;
      }[];
    })
  | null
> => {
  const userRepo = new UserRepository(prisma);
  const userAdminTeams = await userRepo.getUserAdminTeams({ userId });

  if (!userAdminTeams?.id) {
    return null;
  }

  const teams = userAdminTeams.teams.map(({ team }) => {
    const parentLogoUrl = team.parent?.logoUrl;
    const parentName = team.parent?.name;

    let logoUrl = "";
    if (team.parent) {
      logoUrl = getPlaceholderAvatar(parentLogoUrl, parentName);
    } else {
      logoUrl = getPlaceholderAvatar(team.logoUrl, team.name);
    }
    return {
      ...team,
      logoUrl,
    };
  });

  return {
    ...userAdminTeams,
    teams,
  };
};

const getOrgSubTeams = async (
  parentId: number
): Promise<
  {
    id: number;
    name: string;
    logoUrl: string | null;
    isOrganization: boolean;
    parent: { id: number; name: string; logoUrl: string | null } | null;
  }[]
> => {
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
  return teams.map((team) => {
    const parentLogoUrl = team.parent?.logoUrl;
    const parentName = team.parent?.name;
    let logoUrl = "";
    if (team.parent) {
      logoUrl = getPlaceholderAvatar(parentLogoUrl, parentName);
    } else {
      logoUrl = getPlaceholderAvatar(team.logoUrl, team.name);
    }
    return {
      ...team,
      logoUrl,
    };
  });
};

const getAppBySlug = async (
  appSlug: string
): Promise<{ slug: string; keys: Prisma.JsonValue; enabled: boolean; dirName: string } | null> => {
  const app = await prisma.app.findUnique({
    where: { slug: appSlug, enabled: true },
    select: { slug: true, keys: true, enabled: true, dirName: true },
  });
  return app;
};

const getTeamEventTypes = async (
  teamIds: number[],
  isConferencing: boolean,
  eventTypeSelect: Prisma.EventTypeSelect
): Promise<TEventTypeGroup[]> => {
  const teams = await prisma.team.findMany({
    where: { id: { in: teamIds }, isOrganization: false },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      slug: true,
      isOrganization: true,
      eventTypes: { select: eventTypeSelect },
    },
  });
  return teams.map((team) => {
    let filteredEventTypes = team.eventTypes;
    if (isConferencing) {
      filteredEventTypes = filterEventTypesWhereLocationUpdateIsAllowed(team.eventTypes);
    }
    return {
      teamId: team.id,
      slug: team.slug,
      name: team.name,
      isOrganisation: team.isOrganization,
      image: getPlaceholderAvatar(team.logoUrl, team.name),
      eventTypes: (filteredEventTypes as unknown as EventTypeFromDb[])
        .map(mapEventType)
        .sort((a, b) => (b.position || 0) - (a.position || 0)),
    };
  });
};

const getUserEventTypes = async (
  userId: number,
  isConferencing: boolean,
  eventTypeSelect: Prisma.EventTypeSelect
): Promise<TEventTypeGroup[]> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      name: true,
      avatarUrl: true,
      eventTypes: { where: { teamId: null }, select: eventTypeSelect },
    },
  });

  if (!user) return [];

  let filteredEventTypes = user.eventTypes;
  if (isConferencing) {
    filteredEventTypes = filterEventTypesWhereLocationUpdateIsAllowed(user.eventTypes);
  }
  return [
    {
      userId: user.id,
      slug: user.username,
      name: user.name,
      image: getPlaceholderAvatar(user.avatarUrl, user.name),
      eventTypes: (filteredEventTypes as unknown as EventTypeFromDb[])
        .map(mapEventType)
        .sort((a, b) => (b.position || 0) - (a.position || 0)),
    },
  ];
};

const getEventTypes = async ({
  userId,
  teamIds,
  isConferencing = false,
}: {
  userId: number;
  teamIds?: number[];
  isConferencing?: boolean;
}): Promise<TEventTypeGroup[] | null> => {
  if (teamIds && teamIds.length > 0) {
    return getTeamEventTypes(teamIds, isConferencing, eventTypeSelect);
  }

  return getUserEventTypes(userId, isConferencing, eventTypeSelect);
};

const getAppInstallsBySlug = async (
  appSlug: string,
  userId: number,
  teamIds?: number[]
): Promise<Prisma.CredentialGetPayload<Record<string, never>>[]> => {
  if (teamIds?.length) {
    return prisma.credential.findMany({
      where: {
        OR: [
          { appId: appSlug, userId: userId },
          { appId: appSlug, teamId: { in: teamIds } },
        ],
      },
    });
  }

  return prisma.credential.findMany({
    where: { appId: appSlug, userId: userId },
  });
};

const handleAutoInstall = async (
  user: MinimalUser,
  appMetadata: import("@calcom/types/App").AppMeta,
  parsedAppSlug: string
): Promise<number | null> => {
  try {
    const newCredential = await createDefaultInstallation({
      appType: appMetadata.type,
      user: { id: user.id },
      slug: parsedAppSlug,
      key: {},
      teamId: undefined,
    });
    return newCredential.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.credential.findFirst({
        where: { appId: parsedAppSlug, userId: user.id, teamId: null },
        select: { id: true },
      });
      return existing?.id ?? null;
    }
    return null;
  }
};

const getEventTypeGroupsForStep = async (
  user: MinimalUser,
  userTeams: MinimalTeam[],
  parsedTeamIdParam: number | undefined,
  isOrg: boolean,
  isConferencing: boolean
): Promise<TEventTypeGroup[] | null> => {
  let groups: TEventTypeGroup[] | null = null;
  if (isOrg) {
    groups = await getEventTypes({
      userId: user.id,
      teamIds: userTeams.map((item) => item.id),
      isConferencing,
    });
  } else if (parsedTeamIdParam) {
    groups = await getEventTypes({ userId: user.id, teamIds: [parsedTeamIdParam], isConferencing });
  } else {
    groups = await getEventTypes({ userId: user.id, isConferencing });
  }

  if (isConferencing && groups) {
    const destinationCalendar = await prisma.destinationCalendar.findFirst({
      where: { userId: user.id, eventTypeId: null },
    });

    groups.forEach((group) => {
      group.eventTypes = group.eventTypes.map((eventType) => {
        if (!eventType.destinationCalendar) {
          return { ...eventType, destinationCalendar };
        }
        return eventType;
      });
    });
  }
  return groups;
};

const getInitialStep = (
  parsedStepParam: string | undefined,
  hasTeams: boolean,
  showEventTypesStep: boolean,
  parsedAppSlug: string
): { step: string | undefined; redirect?: RedirectResult } => {
  if (!hasTeams && parsedStepParam === AppOnboardingSteps.ACCOUNTS_STEP && showEventTypesStep) {
    return {
      step: parsedStepParam,
      redirect: {
        redirect: { permanent: false, destination: `/apps/installation/event-types?slug=${parsedAppSlug}` },
      },
    };
  }
  let step = parsedStepParam;
  if (!parsedStepParam) {
    if (hasTeams) {
      step = AppOnboardingSteps.ACCOUNTS_STEP;
    } else {
      step = AppOnboardingSteps.EVENT_TYPES_STEP;
    }
  }
  return { step };
};

const getAppAndMetadata = async (
  parsedAppSlug: string
): Promise<{
  app: { slug: string; keys: Prisma.JsonValue; enabled: boolean; dirName: string } | null;
  appMetadata: import("@calcom/types/App").AppMeta | null;
  redirect?: RedirectResult;
}> => {
  const app = await getAppBySlug(parsedAppSlug);
  if (!app)
    return {
      app: null,
      appMetadata: null,
      redirect: { redirect: { permanent: false, destination: "/apps" } },
    };
  const appMetadata = appStoreMetadata[app.dirName as keyof typeof appStoreMetadata];
  if (!appMetadata)
    return {
      app: null,
      appMetadata: null,
      redirect: { redirect: { permanent: false, destination: "/apps" } },
    };
  return { app, appMetadata };
};

const getCredentialId = (
  parsedTeamIdParam: number | undefined,
  appInstalls: Prisma.CredentialGetPayload<Record<string, never>>[],
  userId: number
): number | null => {
  if (parsedTeamIdParam) {
    return appInstalls.find((item) => item.teamId === parsedTeamIdParam)?.id ?? null;
  }
  return appInstalls.find((item) => item.userId === userId)?.id ?? null;
};

const prepareUserTeams = async (
  user: MinimalUser & { teams: MinimalTeam[] },
  parsedTeamIdParam: number | undefined
): Promise<{ userTeams: MinimalTeam[]; isOrg: boolean; redirect?: RedirectResult }> => {
  let userTeams = user.teams;
  let isOrg = false;
  if (parsedTeamIdParam) {
    const currentTeam = userTeams.find((team: MinimalTeam) => team.id === parsedTeamIdParam);
    if (!currentTeam?.id)
      return {
        userTeams: [],
        isOrg: false,
        redirect: { redirect: { permanent: false, destination: "/apps" } },
      };
    if (currentTeam.isOrganization) {
      userTeams = [...userTeams, ...(await getOrgSubTeams(parsedTeamIdParam))];
      isOrg = true;
    }
  }
  return { userTeams, isOrg };
};

const getCredential = async (
  parsedTeamIdParam: number | undefined,
  appInstalls: Prisma.CredentialGetPayload<Record<string, never>>[],
  user: MinimalUser & { teams: MinimalTeam[] },
  initialStep: string,
  appMetadata: import("@calcom/types/App").AppMeta,
  parsedAppSlug: string
): Promise<{ credentialId: number | null; redirect?: RedirectResult }> => {
  let credentialId = getCredentialId(parsedTeamIdParam, appInstalls, user.id);
  if (!credentialId && !user.teams.length && initialStep === AppOnboardingSteps.EVENT_TYPES_STEP) {
    credentialId = await handleAutoInstall(user, appMetadata, parsedAppSlug);
    if (!credentialId)
      return { credentialId: null, redirect: { redirect: { permanent: false, destination: "/apps" } } };
  }
  return { credentialId };
};

const getTeamsInstalled = (
  hasTeams: boolean,
  userTeams: MinimalTeam[],
  appInstalls: Prisma.CredentialGetPayload<Record<string, never>>[]
): import("../../../../modules/apps/installation/[[...step]]/step-view").TTeams => {
  if (!hasTeams) return [];
  return userTeams.map((team: MinimalTeam) => ({
    ...team,
    alreadyInstalled: appInstalls.some((install) => !!install.teamId && install.teamId === team.id),
  }));
};

const getParsedStep = (paramsStep: string | string[] | undefined): string | undefined => {
  if (Array.isArray(paramsStep)) return paramsStep[0];
  return paramsStep;
};

const getInstallationParams = async (
  context: GetServerSidePropsContext
): Promise<{
  parsedAppSlug: string;
  parsedStepParam: string | undefined;
  parsedTeamIdParam: number | undefined;
  sessionId: number | null;
}> => {
  const { query, params, req } = context;
  const parsedAppSlug = z.coerce.string().parse(query?.slug);
  const parsedStepParam = z.string().optional().parse(getParsedStep(params?.step));
  const parsedTeamIdParam = z.coerce.number().optional().parse(query?.teamId);
  const session = await getServerSession({ req });
  const sessionId = (session?.user as { id?: number })?.id ?? null;
  return { parsedAppSlug, parsedStepParam, parsedTeamIdParam, sessionId };
};

export const getServerSideProps = async (
  context: GetServerSidePropsContext
): Promise<GetServerSidePropsResult<OnboardingPageProps>> => {
  const { parsedAppSlug, parsedStepParam, parsedTeamIdParam, sessionId } =
    await getInstallationParams(context);
  if (!sessionId) return { redirect: { permanent: false, destination: "/auth/login" } };

  const { app, appMetadata, redirect: appRedirect } = await getAppAndMetadata(parsedAppSlug);
  if (appRedirect) return appRedirect;

  const user = await getUser(sessionId);
  if (!user?.username || !appMetadata) return { redirect: { permanent: false, destination: "/apps" } };
  const appMetadataFinal = appMetadata;

  const showEventTypesStep =
    appMetadataFinal.extendsFeature === "EventType" || isConferencingApp(appMetadataFinal.categories);
  const { userTeams, isOrg, redirect: teamRedirect } = await prepareUserTeams(user, parsedTeamIdParam);
  if (teamRedirect) return teamRedirect;
  const { step: initialStep, redirect: stepRedirect } = getInitialStep(
    parsedStepParam,
    !!userTeams.length,
    showEventTypesStep,
    parsedAppSlug
  );
  if (stepRedirect) return stepRedirect;

  let initialStepValidated: (typeof STEPS)[number];
  try {
    initialStepValidated = z.enum(STEPS).parse(initialStep);
  } catch {
    return { redirect: { permanent: false, destination: "/apps" } };
  }

  const appInstalls = await getAppInstallsBySlug(
    parsedAppSlug,
    user.id,
    userTeams.map(({ id }: MinimalTeam) => id)
  );
  const { credentialId, redirect: credRedirect } = await getCredential(
    parsedTeamIdParam,
    appInstalls,
    user,
    initialStepValidated,
    appMetadataFinal,
    parsedAppSlug
  );
  if (credRedirect) return credRedirect;

  let eventTypeGroups = null;
  if (initialStepValidated === AppOnboardingSteps.EVENT_TYPES_STEP) {
    if (!showEventTypesStep) {
      return {
        redirect: {
          permanent: false,
          destination: `/apps/installed/${appMetadataFinal.categories[0]}?hl=${appMetadataFinal.slug}`,
        },
      };
    }
    eventTypeGroups = await getEventTypeGroupsForStep(
      user,
      userTeams,
      parsedTeamIdParam,
      isOrg,
      isConferencingApp(appMetadataFinal.categories)
    );
    if (!credentialId) return { redirect: { permanent: false, destination: "/apps" } };
  }

  const personalAccount = {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
    alreadyInstalled: appInstalls.some((install) => !install.teamId && install.userId === user.id),
  };
  const teams = getTeamsInstalled(!!user.teams.length, userTeams, appInstalls);

  return {
    props: {
      app,
      appMetadata: appMetadataFinal,
      showEventTypesStep,
      step: initialStepValidated,
      personalAccount,
      teams,
      eventTypeGroups,
      userName: user.username,
      credentialId: credentialId || undefined,
      isConferencing: isConferencingApp(appMetadataFinal.categories),
      isOrg,
      installableOnTeams:
        !!appMetadataFinal?.concurrentMeetings || !isConferencingApp(appMetadataFinal.categories),
    } as OnboardingPageProps,
  };
};
