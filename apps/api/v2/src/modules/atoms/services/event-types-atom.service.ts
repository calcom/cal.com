import { EventTypesService_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/services/event-types.service";
import { AtomsRepository } from "@/modules/atoms/atoms.repository";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { OrganizationsTeamsRepository } from "@/modules/organizations/repositories/organizations-teams.repository";
import { OrganizationsEventTypesService } from "@/modules/organizations/services/event-types/organizations-event-types.service";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { UsersService } from "@/modules/users/services/users.service";
import { UserWithProfile } from "@/modules/users/users.repository";
import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";

import {
  updateEventType,
  TUpdateEventTypeInputSchema,
  systemBeforeFieldEmail,
  getEventTypeById,
  getEnabledAppsFromCredentials,
  getAppFromSlug,
  MembershipRole,
  EventTypeMetaDataSchema,
  getClientSecretFromPayment,
  getBulkEventTypes,
  bulkUpdateEventsToDefaultLocation,
} from "@calcom/platform-libraries";
import type {
  App,
  CredentialDataWithTeamName,
  LocationOption,
  TeamQuery,
  CredentialOwner,
  TDependencyData,
  CredentialPayload,
} from "@calcom/platform-libraries";
import { PrismaClient } from "@calcom/prisma";

type EnabledAppType = App & {
  credential: CredentialDataWithTeamName;
  credentials: CredentialDataWithTeamName[];
  locationOption: LocationOption | null;
};

@Injectable()
export class EventTypesAtomService {
  constructor(
    private readonly membershipsRepository: MembershipsRepository,
    private readonly credentialsRepository: CredentialsRepository,
    private readonly atomsRepository: AtomsRepository,
    private readonly organizationsTeamsRepository: OrganizationsTeamsRepository,
    private readonly usersService: UsersService,
    private readonly dbWrite: PrismaWriteService,
    private readonly dbRead: PrismaReadService,
    private readonly eventTypeService: EventTypesService_2024_06_14,
    private readonly teamEventTypeService: OrganizationsEventTypesService
  ) {}

  async getUserEventType(user: UserWithProfile, eventTypeId: number) {
    const organizationId = this.usersService.getUserMainOrgId(user);

    const isUserOrganizationAdmin = organizationId
      ? await this.membershipsRepository.isUserOrganizationAdmin(user.id, organizationId)
      : false;

    const eventType = await getEventTypeById({
      currentOrganizationId: this.usersService.getUserMainOrgId(user),
      eventTypeId,
      userId: user.id,
      prisma: this.dbRead.prisma as unknown as PrismaClient,
      isUserOrganizationAdmin,
      isTrpcCall: true,
    });

    if (!eventType) {
      throw new NotFoundException(`Event type with id ${eventTypeId} not found`);
    }

    if (eventType?.team?.id) {
      await this.checkTeamOwnsEventType(user.id, eventType.eventType.id, eventType.team.id);
    } else {
      this.eventTypeService.checkUserOwnsEventType(user.id, eventType.eventType);
    }

    return eventType;
  }

  async getUserEventTypes(userId: number) {
    return getBulkEventTypes(userId);
  }

  async updateTeamEventType(
    eventTypeId: number,
    body: TUpdateEventTypeInputSchema,
    user: UserWithProfile,
    teamId: number
  ) {
    await this.checkCanUpdateTeamEventType(user.id, eventTypeId, teamId, body.scheduleId);
    const eventTypeUser = await this.eventTypeService.getUserToUpdateEvent(user);
    const bookingFields = [...(body.bookingFields || [])];

    if (
      !bookingFields.find((field) => field.type === "email") &&
      !bookingFields.find((field) => field.type === "phone")
    ) {
      bookingFields.push(systemBeforeFieldEmail);
    }

    const eventType = await updateEventType({
      input: { id: eventTypeId, ...body, bookingFields },
      ctx: {
        user: eventTypeUser,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        prisma: this.dbWrite.prisma,
      },
    });

    if (!eventType) {
      throw new NotFoundException(`Event type with id ${eventTypeId} not found`);
    }

    return eventType.eventType;
  }

  async updateEventType(eventTypeId: number, body: TUpdateEventTypeInputSchema, user: UserWithProfile) {
    await this.eventTypeService.checkCanUpdateEventType(user.id, eventTypeId, body.scheduleId);
    const eventTypeUser = await this.eventTypeService.getUserToUpdateEvent(user);
    const bookingFields = [...(body.bookingFields || [])];

    if (
      !bookingFields.find((field) => field.type === "email") &&
      !bookingFields.find((field) => field.type === "phone")
    ) {
      bookingFields.push(systemBeforeFieldEmail);
    }

    const eventType = await updateEventType({
      input: { id: eventTypeId, ...body, bookingFields },
      ctx: {
        user: eventTypeUser,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        prisma: this.dbWrite.prisma,
      },
    });

    if (!eventType) {
      throw new NotFoundException(`Event type with id ${eventTypeId} not found`);
    }

    return eventType.eventType;
  }

  async checkCanUpdateTeamEventType(userId: number, eventTypeId: number, teamId: number, scheduleId: number) {
    await this.checkTeamOwnsEventType(userId, eventTypeId, teamId);
    await this.teamEventTypeService.validateEventTypeExists(teamId, eventTypeId);
    await this.eventTypeService.checkUserOwnsSchedule(userId, scheduleId);
  }

  async checkTeamOwnsEventType(userId: number, eventTypeId: number, teamId: number) {
    const membership = await this.dbRead.prisma.membership.findFirst({
      where: {
        userId,
        teamId,
        accepted: true,
        OR: [{ role: "ADMIN" }, { role: "OWNER" }],
      },
      select: {
        team: {
          select: {
            eventTypes: true,
          },
        },
      },
    });
    if (!membership?.team?.eventTypes?.some((item) => item.id === eventTypeId)) {
      throw new ForbiddenException(
        `Access denied. Either the team with ID=${teamId} does not own the event type with ID=${eventTypeId}, or your MEMBER role does not have permission to access this resource.`
      );
    }
  }

  async getEventTypesAppIntegration(slug: string, userId: number, userName: string | null, teamId?: number) {
    let credentials = await this.credentialsRepository.getAllUserCredentialsById(userId);
    let userTeams: TeamQuery[] = [];
    if (teamId) {
      const teamsQuery = await this.organizationsTeamsRepository.getUserTeamsById(userId);
      // If a team is a part of an org then include those apps
      // Don't want to iterate over these parent teams
      const filteredTeams: TeamQuery[] = [];
      const parentTeams: TeamQuery[] = [];
      // Only loop and grab parent teams if a teamId was given. If not then all teams will be queried
      if (teamId) {
        teamsQuery.forEach((team) => {
          if (team?.parent) {
            const { parent, ...filteredTeam } = team;
            filteredTeams.push(filteredTeam);
            // Only add parent team if it's not already in teamsQuery
            if (!teamsQuery.some((t) => t.id === parent.id)) {
              parentTeams.push(parent);
            }
          }
        });
      }
      userTeams = [...teamsQuery, ...parentTeams];
      const teamAppCredentials: CredentialPayload[] = userTeams.flatMap((teamApp) => {
        return teamApp.credentials ? teamApp.credentials.flat() : [];
      });
      if (teamId) {
        credentials = teamAppCredentials;
      } else {
        credentials = credentials.concat(teamAppCredentials);
      }
    }
    const enabledApps = await getEnabledAppsFromCredentials(credentials, {
      where: { slug },
    });
    const apps = await Promise.all(
      enabledApps
        .filter(({ ...app }) => app.slug === slug)
        .map(
          async ({
            credentials: _,
            credential,
            key: _2 /* don't leak to frontend */,
            ...app
          }: EnabledAppType) => {
            const userCredentialIds = credentials
              .filter((c) => c.appId === app.slug && !c.teamId)
              .map((c) => c.id);
            const invalidCredentialIds = credentials
              .filter((c) => c.appId === app.slug && c.invalid)
              .map((c) => c.id);
            const teams = await Promise.all(
              credentials
                .filter((c) => c.appId === app.slug && c.teamId)
                .map(async (c) => {
                  const team = userTeams.find((team) => team.id === c.teamId);
                  if (!team) {
                    return null;
                  }
                  return {
                    teamId: team.id,
                    name: team.name,
                    logoUrl: team.logoUrl,
                    credentialId: c.id,
                    isAdmin:
                      team.members[0].role === MembershipRole.ADMIN ||
                      team.members[0].role === MembershipRole.OWNER,
                  };
                })
            );
            const isSetupAlready = credential && app.categories.includes("payment") ? true : undefined;
            let dependencyData: TDependencyData = [];
            if (app.dependencies?.length) {
              dependencyData = app.dependencies.map((dependency) => {
                const dependencyInstalled = enabledApps.some(
                  (dbAppIterator: EnabledAppType) =>
                    dbAppIterator.credentials.length && dbAppIterator.slug === dependency
                );
                // If the app marked as dependency is simply deleted from the codebase,
                // we can have the situation where App is marked installed in DB but we couldn't get the app.
                const dependencyName = getAppFromSlug(dependency)?.name;
                return { name: dependencyName, installed: dependencyInstalled };
              });
            }
            const credentialOwner: CredentialOwner = {
              name: userName,
              teamId,
            };
            return {
              ...app,
              ...(teams.length && {
                credentialOwner,
              }),
              userCredentialIds,
              invalidCredentialIds,
              teams,
              isInstalled: !!userCredentialIds.length || !!teams.length || app.isGlobal,
              isSetupAlready,
              ...(app.dependencies && { dependencyData }),
            };
          }
        )
    );
    return apps[0];
  }

  async getUserPaymentInfo(uid: string) {
    const rawPayment = await this.atomsRepository.getRawPayment(uid);
    if (!rawPayment) throw new NotFoundException(`Payment with uid ${uid} not found`);
    const { data, booking: _booking, ...restPayment } = rawPayment;
    const payment = {
      ...restPayment,
      data: data as Record<string, unknown>,
    };
    if (!_booking) throw new NotFoundException(`Booking with uid ${uid} not found`);
    const { startTime, endTime, eventType, ...restBooking } = _booking;
    const booking = {
      ...restBooking,
      startTime: startTime.toString(),
      endTime: endTime.toString(),
    };
    if (!eventType) throw new NotFoundException(`Event type with uid ${uid} not found`);
    if (eventType.users.length === 0 && !!!eventType.team)
      throw new NotFoundException(`No users found or no team present for event type with uid ${uid}`);
    const [user] = eventType?.users.length
      ? eventType.users
      : [{ name: null, theme: null, hideBranding: null, username: null }];
    const profile = {
      name: eventType.team?.name || user?.name || null,
      theme: (!eventType.team?.name && user?.theme) || null,
      hideBranding: eventType.team?.hideBranding || user?.hideBranding || null,
    };
    return {
      user,
      eventType: {
        ...eventType,
        metadata: EventTypeMetaDataSchema.parse(eventType.metadata),
      },
      booking,
      payment,
      clientSecret: getClientSecretFromPayment(payment),
      profile,
    };
  }

  async bulkUpdateEventTypesDefaultLocation(user: UserWithProfile, eventTypeIds: number[]) {
    return bulkUpdateEventsToDefaultLocation({
      eventTypeIds,
      user,
      prisma: this.dbWrite.prisma as unknown as PrismaClient,
    });
  }
}
