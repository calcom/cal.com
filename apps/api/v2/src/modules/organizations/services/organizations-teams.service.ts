import { Injectable } from "@nestjs/common";

import { supabase } from "../../../config/supabase";
import { MembershipsRepository } from "../../memberships/memberships.repository";
import { CreateOrgTeamDto } from "../../organizations/inputs/create-organization-team.input";
import { UpdateOrgTeamDto } from "../../organizations/inputs/update-organization-team.input";
import { OrganizationsTeamsRepository } from "../../organizations/repositories/organizations-teams.repository";
import { UserWithProfile } from "../../users/users.repository";

@Injectable()
export class OrganizationsTeamsService {
  constructor(
    private readonly organizationsTeamRepository: OrganizationsTeamsRepository,
    private readonly membershipsRepository: MembershipsRepository
  ) {}

  async getPaginatedOrgUserTeams(organizationId: number, userId: number, skip = 0, take = 250) {
    const teams = await this.organizationsTeamRepository.findOrgUserTeamsPaginated(
      organizationId,
      userId,
      skip,
      take
    );
    return teams;
  }

  async getPaginatedOrgTeams(organizationId: number, skip = 0, take = 250) {
    const teams = await this.organizationsTeamRepository.findOrgTeamsPaginated(organizationId, skip, take);
    return teams;
  }

  async deleteOrgTeam(organizationId: number, teamId: number) {
    const team = await this.organizationsTeamRepository.deleteOrgTeam(organizationId, teamId);
    return team;
  }

  async updateOrgTeam(organizationId: number, teamId: number, data: UpdateOrgTeamDto) {
    const team = await this.organizationsTeamRepository.updateOrgTeam(organizationId, teamId, data);
    return team;
  }

  async createOrgTeam(organizationId: number, data: CreateOrgTeamDto, user: UserWithProfile) {
    const { autoAcceptCreator, ...rest } = data;

    const team = await this.organizationsTeamRepository.createOrgTeam(organizationId, rest);

    if (user.role !== "ADMIN") {
      await this.membershipsRepository.createMembership(team.id, user.id, "OWNER", !!autoAcceptCreator);
    }
    return team;
  }

  async createPlatformOrgTeam(
    organizationId: number,
    oAuthClientId: string,
    data: CreateOrgTeamDto,
    user: UserWithProfile
  ) {
    const { autoAcceptCreator, ...rest } = data;

    const team = await this.organizationsTeamRepository.createPlatformOrgTeam(
      organizationId,
      oAuthClientId,
      rest
    );

    if (user.role !== "ADMIN") {
      await this.membershipsRepository.createMembership(team.id, user.id, "OWNER", !!autoAcceptCreator);
    }
    return team;
  }

  async addUserToTeamEvents(userId: number, organizationId: number) {
    const orgTeams = await this.organizationsTeamRepository.findOrgTeams(organizationId);

    for (const team of orgTeams) {
      await this.updateNewTeamMemberEventTypes(userId, team.id);
    }
  }

  async addUserToPlatformTeamEvents(userId: number, organizationId: number, oAuthClientId: string) {
    const oAuthClientTeams = await this.organizationsTeamRepository.getPlatformOrgTeams(
      organizationId,
      oAuthClientId
    );

    if (oAuthClientTeams) {
      for (const team of oAuthClientTeams) {
        await this.updateNewTeamMemberEventTypes(userId, team.id);
      }
    }
  }

  async updateNewTeamMemberEventTypes(userId: number, teamId: number) {
    const { data: eventTypesToAdd, error } = await supabase
      .from("EventType")
      .select("*")
      .eq("teamId", teamId)
      .eq("assignAllTeamMembers", true);

    // const allManagedEventTypePropsZod = _EventTypeModel.pick(allManagedEventTypeProps);

    if (!error && eventTypesToAdd && eventTypesToAdd.length > 0) {
      eventTypesToAdd.map(async (eventType) => {
        if (eventType.schedulingType === "MANAGED") {
          // const managedEventTypeValues = allManagedEventTypePropsZod
          //   .omit(unlockedManagedEventTypeProps)
          //   .parse(eventType);
          // // Define the values for unlocked properties to use on creation, not updation
          // const unlockedEventTypeValues = allManagedEventTypePropsZod
          //   .pick(unlockedManagedEventTypeProps)
          //   .parse(eventType);
          // Calculate if there are new workflows for which assigned members will get too
          const currentWorkflowIds = eventType.workflows?.map((wf: any) => wf.workflowId);
          const { data } = await supabase.from("EventType").update({
            // ...managedEventTypeValues,
            // ...unlockedEventTypeValues,
            // bookingLimits:
            //   (managedEventTypeValues.bookingLimits as unknown as Prisma.InputJsonObject) ?? undefined,
            // recurringEvent:
            //   (managedEventTypeValues.recurringEvent as unknown as Prisma.InputJsonValue) ?? undefined,
            // metadata: (managedEventTypeValues.metadata as Prisma.InputJsonValue) ?? undefined,
            // bookingFields: (managedEventTypeValues.bookingFields as Prisma.InputJsonValue) ?? undefined,
            // durationLimits: (managedEventTypeValues.durationLimits as Prisma.InputJsonValue) ?? undefined,
            // eventTypeColor: (managedEventTypeValues.eventTypeColor as Prisma.InputJsonValue) ?? undefined,
            // onlyShowFirstAvailableSlot: managedEventTypeValues.onlyShowFirstAvailableSlot ?? false,
            userId,
            parentId: eventType.parentId,
            hidden: false,
            // workflows: currentWorkflowIds && {
            //   create: currentWorkflowIds.map((wfId) => ({ workflowId: wfId })),
            // },
          });
        } else {
          const { data: updatedUser } = await supabase
            .from("EventType")
            .update({ hosts: { create: [{ userId, isFixed: eventType.schedulingType === "COLLECTIVE" }] } })
            .eq("id", eventType.id)
            .single();

          return updatedUser;
        }
      });
    }
  }
}
