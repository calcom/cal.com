import { Injectable } from "@nestjs/common";
import { CreateEventTypeInput_2024_04_15 } from "@/ee/event-types/event-types_2024_04_15/inputs/create-event-type.input";
import { EventTypesRepository_2024_04_15 } from "@/ee/event-types/event-types_2024_04_15/event-types.repository";
import { UserWithProfile } from "@/modules/users/users.repository";
import { MembershipsService } from "@/modules/memberships/memberships.service";
import { UsersService } from "@/modules/users/services/users.service";
import { MembershipRole } from "@prisma/client";
import { TRPCError } from "@trpc/server";

@Injectable()
export class EventTypesService_2024_04_15 {
  constructor(
    private readonly eventTypesRepository: EventTypesRepository_2024_04_15,
    private readonly membershipsService: MembershipsService,
    private readonly usersService: UsersService
  ) {}

  async createUserEventType(user: UserWithProfile, body: CreateEventTypeInput_2024_04_15) {
    const eventType = await this.eventTypesRepository.createUserEventType(user.id, {
      title: body.title,
      slug: body.slug,
      length: body.length,
      hidden: body.hidden,
    });

    // Handle email assignments
    if (body.assignEmails) {
      await this.assignEmailsToEventType(user, eventType.id, body.assignEmails);
    }

    return eventType;
  }

  private async assignEmailsToEventType(user: UserWithProfile, eventTypeId: number, emails: string) {
    const emailList = emails
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    for (const email of emailList) {
      try {
        // Check if user exists by email
        const existingUser = await this.usersService.findUserByEmail(email);

        if (existingUser) {
          // Add existing user to event type
          await this.eventTypesRepository.addUserToEventType(existingUser.id, eventTypeId);
        } else {
          // Create new team member and add to event type
          const newMember = await this.membershipsService.createTeamMember({
            email,
            role: MembershipRole.MEMBER,
            invitedBy: user.id,
          });

          if (newMember) {
            await this.eventTypesRepository.addUserToEventType(newMember.userId, eventTypeId);
          }
        }
      } catch (error) {
        console.error(`Failed to assign email ${email}:`, error);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Failed to assign email ${email}`,
        });
      }
    }
  }
}