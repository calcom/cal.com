import { TeamRepository } from "@/repositories/team.repository";
import { EventTypeRepository } from "@/repositories/event-type.repository";
import type {
  TeamResponse,
  MembershipResponse,
  TeamScheduleResponse,
  createTeamBodySchema,
  updateTeamBodySchema,
  createTeamMembershipBodySchema,
  updateTeamMembershipBodySchema,
  TeamPaginationQuery,
  MembershipPaginationQuery
} from "@/schema/team.schema";
import type { EventTypePaginationQuery, EventTypeResponse } from "@/schema/event-type.schema";
import type { PaginationQuery } from "@/types";
import { ConflictError, UnauthorizedError } from "@/utils";
import type { z } from "zod";

import type { PrismaClient } from "@calcom/prisma/client";
import type { CalIdTeam, CalIdMembership, EventType, Prisma } from "@calcom/prisma/client";
import { CalIdMembershipRole } from "@calcom/prisma/client";

import { BaseService } from "../base.service";

type CreateTeamInput = z.infer<typeof createTeamBodySchema>;
type UpdateTeamInput = z.infer<typeof updateTeamBodySchema>;
type CreateTeamMembershipInput = z.infer<typeof createTeamMembershipBodySchema>;
type UpdateTeamMembershipInput = z.infer<typeof updateTeamMembershipBodySchema>;

export class TeamService extends BaseService {
  private teamRepository: TeamRepository;
  private eventTypeRepository: EventTypeRepository;

  constructor(prisma: PrismaClient) {
    super(prisma);
    this.teamRepository = new TeamRepository(prisma);
    this.eventTypeRepository = new EventTypeRepository(prisma);
  }

  // Team CRUD operations
  async getTeamById(userId: number, teamId: number): Promise<TeamResponse> {
    this.logOperation("getTeamById", { userId, teamId });

    try {
      const team = await this.teamRepository.findByUserIdAndTeamIdOrThrow(userId, teamId);
      return this.mapTeamToResponse(team);
    } catch (error) {
      this.logError("getTeamById", error);
      throw error;
    }
  }

  async getTeams(
    userId: number,
    filters: Omit<Prisma.CalIdTeamWhereInput, 'members'> = {},
    pagination: TeamPaginationQuery = {}
  ) {
    this.logOperation("getTeams", { userId, filters, pagination });

    try {
      const result = await this.teamRepository.findManyByUserId(userId, filters, pagination);

      return {
        data: result.data.map((team: any) => this.mapTeamToResponse(team)),
        pagination: result.pagination,
      };
    } catch (error) {
      this.logError("getTeams", error);
      throw error;
    }
  }

  async teamExists(userId: number, teamId: number): Promise<boolean> {
    try {
      return await this.teamRepository.existsByUserIdAndTeamId(userId, teamId);
    } catch (error) {
      this.logError("teamExists", error);
      throw error;
    }
  }

  async createTeam(userId: number, input: CreateTeamInput): Promise<TeamResponse> {
    this.logOperation("createTeam", { userId, input });

    try {
      // Generate slug if not provided
      if (!input.slug) {
        input.slug = input.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      }

      // Check if slug already exists
      const existingTeam = await this.teamRepository.slugExists(input.slug);
      if (existingTeam) {
        throw new ConflictError("Team with this slug already exists");
      }

      const team = await this.teamRepository.create({
        ...input,
        members: {
          create: {
            userId,
            role: CalIdMembershipRole.OWNER,
            acceptedInvitation: true,
          }
        }
      });

      return this.mapTeamToResponse(team);
    } catch (error) {
      this.logError("createTeam", error);
      throw error;
    }
  }

  async updateTeam(
    userId: number,
    teamId: number,
    input: UpdateTeamInput
  ): Promise<TeamResponse> {
    this.logOperation("updateTeam", { userId, teamId, input });

    try {
      // Check if team exists and user has permissions
       const userMembership = await this.teamRepository.getUserMembershipInTeam(userId, teamId);
      if (
        !userMembership ||
        !([CalIdMembershipRole.ADMIN, CalIdMembershipRole.OWNER] as CalIdMembershipRole[]).includes(userMembership.role)
      ) {
        throw new UnauthorizedError("Insufficient permissions to update team");
      }
      const existingTeam = await this.teamRepository.findByUserIdAndTeamIdOrThrow(userId, teamId);

      // Check if slug already exists for another team
      if (input.slug && input.slug !== existingTeam.slug) {
        const slugExists = await this.teamRepository.slugExists(input.slug, teamId);
        if (slugExists) {
          throw new ConflictError("Team with this slug already exists");
        }
      }

      const updatedTeam = await this.teamRepository.updateByUserIdAndTeamId(userId, teamId, input);
      return this.mapTeamToResponse(updatedTeam);
    } catch (error) {
      this.logError("updateTeam", error);
      throw error;
    }
  }

  async deleteTeam(userId: number, teamId: number): Promise<void> {
    this.logOperation("deleteTeam", { userId, teamId });

    try {
      await this.teamRepository.deleteByUserIdAndTeamId(userId, teamId);
    } catch (error) {
      this.logError("deleteTeam", error);
      throw error;
    }
  }

  // Team Event Types operations
  async getTeamEventTypes(
    userId: number,
    teamId: number,
    filters: Omit<Prisma.EventTypeWhereInput, 'teamId'> = {},
    pagination: EventTypePaginationQuery = {}
  ) {
    this.logOperation("getTeamEventTypes", { userId, teamId, filters, pagination });

    try {
      // Check if user has access to the team
      await this.teamRepository.findByUserIdAndTeamIdOrThrow(userId, teamId);

      const result = await this.teamRepository.findEventTypesByTeamId(teamId, filters, pagination);

      return {
        data: result.data.map((eventType: any) => this.mapEventTypeToResponse(eventType)),
        pagination: result.pagination,
      };
    } catch (error) {
      this.logError("getTeamEventTypes", error);
      throw error;
    }
  }

  async getTeamEventTypeById(userId: number, teamId: number, eventTypeId: number): Promise<EventTypeResponse> {
    this.logOperation("getTeamEventTypeById", { userId, teamId, eventTypeId });

    try {
      // Check if user has access to the team
      await this.teamRepository.findByUserIdAndTeamIdOrThrow(userId, teamId);

      const eventType = await this.teamRepository.findEventTypeByTeamIdAndEventTypeIdOrThrow(teamId, eventTypeId);
      return this.mapEventTypeToResponse(eventType);
    } catch (error) {
      this.logError("getTeamEventTypeById", error);
      throw error;
    }
  }

  async createTeamEventType(
    userId: number,
    teamId: number,
    input: any // EventType creation input
  ): Promise<EventTypeResponse> {
    this.logOperation("createTeamEventType", { userId, teamId, input });

    try {
      // Check if user has access to the team
      const userMembership = await this.teamRepository.getUserMembershipInTeam(userId, teamId);
      if (
        !userMembership ||
        !([CalIdMembershipRole.ADMIN, CalIdMembershipRole.OWNER] as CalIdMembershipRole[]).includes(userMembership.role)
      ) {
        throw new UnauthorizedError("Insufficient permissions to create team event type");
      }
      await this.teamRepository.findByUserIdAndTeamIdOrThrow(userId, teamId);

      // Check if slug already exists for this team
      const existingEventType = await this.eventTypeRepository.slugExists(input.slug, undefined, teamId);
      if (existingEventType) {
        throw new ConflictError("Event type with this slug already exists");
      }

      const eventType = await this.eventTypeRepository.create({
        ...input,
        team: {
          connect: { id: teamId }
        }
      });

      return this.mapEventTypeToResponse(eventType);
    } catch (error) {
      this.logError("createTeamEventType", error);
      throw error;
    }
  }

  async updateTeamEventType(
    userId: number,
    teamId: number,
    eventTypeId: number,
    input: any // EventType update input
  ): Promise<EventTypeResponse> {
    this.logOperation("updateTeamEventType", { userId, teamId, eventTypeId, input });

    try {
      // Check if user has access to the team
       const userMembership = await this.teamRepository.getUserMembershipInTeam(userId, teamId);
      if (
        !userMembership ||
        !([CalIdMembershipRole.ADMIN, CalIdMembershipRole.OWNER] as CalIdMembershipRole[]).includes(userMembership.role)
      ) {
        throw new UnauthorizedError("Insufficient permissions to update team event type");
      }
      await this.teamRepository.findByUserIdAndTeamIdOrThrow(userId, teamId);

      // Check if event type exists and belongs to team
      const existingEventType = await this.teamRepository.findEventTypeByTeamIdAndEventTypeIdOrThrow(teamId, eventTypeId);

      // Check if slug already exists for another event type
      if (input.slug && input.slug !== existingEventType.slug) {
        const slugExists = await this.eventTypeRepository.slugExists(input.slug, undefined, teamId, eventTypeId);
        if (slugExists) {
          throw new ConflictError("Event type with this slug already exists");
        }
      }

      const updatedEventType = await this.eventTypeRepository.update(eventTypeId, input);
      return this.mapEventTypeToResponse(updatedEventType);
    } catch (error) {
      this.logError("updateTeamEventType", error);
      throw error;
    }
  }

  async deleteTeamEventType(userId: number, teamId: number, eventTypeId: number): Promise<void> {
    this.logOperation("deleteTeamEventType", { userId, teamId, eventTypeId });

    try {
      // Check if user has access to the team
       const userMembership = await this.teamRepository.getUserMembershipInTeam(userId, teamId);
      if (
        !userMembership ||
        !([CalIdMembershipRole.ADMIN, CalIdMembershipRole.OWNER] as CalIdMembershipRole[]).includes(userMembership.role)
      ) {
        throw new UnauthorizedError("Insufficient permissions to delete team event type");
      }
      await this.teamRepository.findByUserIdAndTeamIdOrThrow(userId, teamId);

      // Check if event type exists and belongs to team
      await this.teamRepository.findEventTypeByTeamIdAndEventTypeIdOrThrow(teamId, eventTypeId);

      await this.eventTypeRepository.delete(eventTypeId);
    } catch (error) {
      this.logError("deleteTeamEventType", error);
      throw error;
    }
  }

  // Team Membership operations
  async getTeamMemberships(
    userId: number,
    teamId: number,
    filters: Omit<Prisma.CalIdMembershipWhereInput, 'calIdTeamId'> = {},
    pagination: MembershipPaginationQuery = {}
  ) {
    this.logOperation("getTeamMemberships", { userId, teamId, filters, pagination });

    try {
      // Check if user has access to the team
      await this.teamRepository.findByUserIdAndTeamIdOrThrow(userId, teamId);

      const result = await this.teamRepository.findMembershipsByTeamId(teamId, filters, pagination);

      return {
        data: result.data.map((membership: any) => this.mapMembershipToResponse(membership)),
        pagination: result.pagination,
      };
    } catch (error) {
      this.logError("getTeamMemberships", error);
      throw error;
    }
  }

  async getTeamMembershipById(userId: number, teamId: number, membershipId: number): Promise<MembershipResponse> {
    this.logOperation("getTeamMembershipById", { userId, teamId, membershipId });

    try {
      // Check if user has access to the team
      await this.teamRepository.findByUserIdAndTeamIdOrThrow(userId, teamId);

      const membership = await this.teamRepository.findMembershipByIdOrThrow(membershipId);

      // Verify membership belongs to the team
      if (membership.calIdTeamId !== teamId) {
        throw new ConflictError("Membership does not belong to this team");
      }

      return this.mapMembershipToResponse(membership);
    } catch (error) {
      this.logError("getTeamMembershipById", error);
      throw error;
    }
  }

  async createTeamMembership(
    userId: number,
    teamId: number,
    input: CreateTeamMembershipInput
  ): Promise<MembershipResponse> {
    this.logOperation("createTeamMembership", { userId, teamId, input });

    try {
      // Check if user has admin/owner access to the team
      const userMembership = await this.teamRepository.getUserMembershipInTeam(userId, teamId);
      if (!userMembership || !([CalIdMembershipRole.ADMIN, CalIdMembershipRole.OWNER] as CalIdMembershipRole[]).includes(userMembership.role)) {
        throw new UnauthorizedError("Insufficient permissions to add team members");
      }

      const { userId: userIdToBeAdded, ...rest } = input;
      const membership = await this.teamRepository.createMembership({
        ...rest,
        calIdTeam: {
          connect: { id: teamId }
        },
        user: {
          connect: { id: userIdToBeAdded }
        }
      });

      return this.mapMembershipToResponse(membership);
    } catch (error) {
      this.logError("createTeamMembership", error);
      throw error;
    }
  }

  async updateTeamMembership(
    userId: number,
    teamId: number,
    membershipId: number,
    input: UpdateTeamMembershipInput
  ): Promise<MembershipResponse> {
    this.logOperation("updateTeamMembership", { userId, teamId, membershipId, input });

    try {
      // Check if user has admin/owner access to the team
      const userMembership = await this.teamRepository.getUserMembershipInTeam(userId, teamId);
      if (!userMembership || !([CalIdMembershipRole.ADMIN, CalIdMembershipRole.OWNER] as CalIdMembershipRole[]).includes(userMembership.role)) {
        throw new UnauthorizedError("Insufficient permissions to update team membership");
      }

      const membership = await this.teamRepository.findMembershipByIdOrThrow(membershipId);

      // Verify membership belongs to the team
      if (membership.calIdTeamId !== teamId) {
        throw new ConflictError("Membership does not belong to this team");
      }

      const updatedMembership = await this.teamRepository.updateMembership(membershipId, input);
      return this.mapMembershipToResponse(updatedMembership);
    } catch (error) {
      this.logError("updateTeamMembership", error);
      throw error;
    }
  }

  async deleteTeamMembership(userId: number, teamId: number, membershipId: number): Promise<void> {
    this.logOperation("deleteTeamMembership", { userId, teamId, membershipId });

    try {
      const membership = await this.teamRepository.findMembershipByIdOrThrow(membershipId);

      // Verify membership belongs to the team
      if (membership.calIdTeamId !== teamId) {
        throw new ConflictError("Membership does not belong to this team");
      }

      // Check permissions: user can delete their own membership or admin/owner can delete others
      const userMembership = await this.teamRepository.getUserMembershipInTeam(userId, teamId);
      const canDelete = membership.userId === userId ||
        (userMembership && ([CalIdMembershipRole.ADMIN, CalIdMembershipRole.OWNER] as CalIdMembershipRole[]).includes(userMembership.role));

      if (!canDelete) {
        throw new UnauthorizedError("Insufficient permissions to delete team membership");
      }

      await this.teamRepository.deleteMembership(membershipId);
    } catch (error) {
      this.logError("deleteTeamMembership", error);
      throw error;
    }
  }

  // Team Schedules operations
  async getTeamSchedules(userId: number, teamId: number): Promise<TeamScheduleResponse[]> {
    this.logOperation("getTeamSchedules", { userId, teamId });

    try {
      // Check if user has admin/owner access to the team
      const userMembership = await this.teamRepository.getUserMembershipInTeam(userId, teamId);
      if (!userMembership || !([CalIdMembershipRole.ADMIN, CalIdMembershipRole.OWNER] as CalIdMembershipRole[]).includes(userMembership.role)) {
        throw new UnauthorizedError("Insufficient permissions to view team schedules");
      }

      const schedules = await this.teamRepository.getTeamSchedules(teamId);
      return schedules;
    } catch (error) {
      this.logError("getTeamSchedules", error);
      throw error;
    }
  }

  // Helper methods
  private mapTeamToResponse(team: CalIdTeam & any): TeamResponse {
    return {
      id: team.id,
      name: team.name,
      slug: team.slug,
      bio: team.bio,
      logoUrl: team.logoUrl,
      hideTeamBranding: team.hideTeamBranding,
      hideTeamProfileLink: team.hideTeamProfileLink,
      isTeamPrivate: team.isTeamPrivate,
      hideBookATeamMember: team.hideBookATeamMember,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
      metadata: team.metadata,
      theme: team.theme,
      brandColor: team.brandColor,
      darkBrandColor: team.darkBrandColor,
      timeFormat: team.timeFormat,
      timeZone: team.timeZone,
      weekStart: team.weekStart,
      bookingFrequency: team.bookingFrequency,
      memberCount: team._count?.members || team.members?.length || 0,
      eventTypeCount: team._count?.eventTypes || team.eventTypes?.length || 0,
    };
  }

  private mapMembershipToResponse(membership: CalIdMembership & any): MembershipResponse {
    return {
      id: membership.id,
      teamId: membership.calIdTeamId,
      userId: membership.userId,
      acceptedInvitation: membership.acceptedInvitation,
      role: membership.role,
      impersonation: membership.impersonation,
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt,
      user: membership.user,
      team: membership.calIdTeam,
    };
  }

  private mapEventTypeToResponse(eventType: EventType): EventTypeResponse {
    return {
      id: eventType.id,
      title: eventType.title,
      slug: eventType.slug,
      description: eventType.description,
      interfaceLanguage: eventType.interfaceLanguage,
      position: eventType.position,
      locations: eventType.locations,
      length: eventType.length,
      offsetStart: eventType.offsetStart,
      hidden: eventType.hidden,
      userId: eventType.userId,
      teamId: eventType.teamId,
      profileId: eventType.profileId,
      timeZone: eventType.timeZone,
      periodType: eventType.periodType,
      periodStartDate: eventType.periodStartDate,
      periodEndDate: eventType.periodEndDate,
      periodDays: eventType.periodDays,
      periodCountCalendarDays: eventType.periodCountCalendarDays,
      lockTimeZoneToggleOnBookingPage: eventType.lockTimeZoneToggleOnBookingPage,
      lockedTimeZone: eventType.lockedTimeZone,
      requiresConfirmation: eventType.requiresConfirmation,
      requiresConfirmationWillBlockSlot: eventType.requiresConfirmationWillBlockSlot,
      requiresConfirmationForFreeEmail: eventType.requiresConfirmationForFreeEmail,
      requiresBookerEmailVerification: eventType.requiresBookerEmailVerification,
      recurringEvent: eventType.recurringEvent,
      disableGuests: eventType.disableGuests,
      hideCalendarNotes: eventType.hideCalendarNotes,
      hideCalendarEventDetails: eventType.hideCalendarEventDetails,
      minimumBookingNotice: eventType.minimumBookingNotice,
      beforeEventBuffer: eventType.beforeEventBuffer,
      afterEventBuffer: eventType.afterEventBuffer,
      seatsPerTimeSlot: eventType.seatsPerTimeSlot,
      onlyShowFirstAvailableSlot: eventType.onlyShowFirstAvailableSlot,
      disableCancelling: eventType.disableCancelling,
      disableRescheduling: eventType.disableRescheduling,
      seatsShowAttendees: eventType.seatsShowAttendees,
      seatsShowAvailabilityCount: eventType.seatsShowAvailabilityCount,
      schedulingType: eventType.schedulingType,
      scheduleId: eventType.scheduleId,
      price: eventType.price,
      currency: eventType.currency,
      slotInterval: eventType.slotInterval,
      metadata: eventType.metadata,
      successRedirectUrl: eventType.successRedirectUrl,
      forwardParamsSuccessRedirect: eventType.forwardParamsSuccessRedirect,
      bookingLimits: eventType.bookingLimits,
      durationLimits: eventType.durationLimits,
      isInstantEvent: eventType.isInstantEvent,
      instantMeetingExpiryTimeOffsetInSeconds: eventType.instantMeetingExpiryTimeOffsetInSeconds,
      assignAllTeamMembers: eventType.assignAllTeamMembers,
      assignRRMembersUsingSegment: eventType.assignRRMembersUsingSegment,
      rrSegmentQueryValue: eventType.rrSegmentQueryValue,
      useEventTypeDestinationCalendarEmail: eventType.useEventTypeDestinationCalendarEmail,
      isRRWeightsEnabled: eventType.isRRWeightsEnabled,
      maxLeadThreshold: eventType.maxLeadThreshold,
      includeNoShowInRRCalculation: eventType.includeNoShowInRRCalculation,
      allowReschedulingPastBookings: eventType.allowReschedulingPastBookings,
      hideOrganizerEmail: eventType.hideOrganizerEmail,
      maxActiveBookingsPerBooker: eventType.maxActiveBookingsPerBooker,
      maxActiveBookingPerBookerOfferReschedule: eventType.maxActiveBookingPerBookerOfferReschedule,
      customReplyToEmail: eventType.customReplyToEmail,
      eventTypeColor: eventType.eventTypeColor,
      rescheduleWithSameRoundRobinHost: eventType.rescheduleWithSameRoundRobinHost,
      secondaryEmailId: eventType.secondaryEmailId,
      useBookerTimezone: eventType.useBookerTimezone,
      restrictionScheduleId: eventType.restrictionScheduleId,
    };
  }

}