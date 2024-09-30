import { Injectable } from "@nestjs/common";

import { getEventTypeById } from "@calcom/platform-libraries";
import type { PrismaClient } from "@calcom/prisma";

import { supabase } from "../../../config/supabase";
import { UsersService } from "../../../modules/users/services/users.service";
import { UserWithProfile } from "../../../modules/users/users.repository";
import { CreateEventTypeInput_2024_04_15 } from "../../event-types/event-types_2024_04_15/inputs/create-event-type.input";

@Injectable()
export class EventTypesRepository_2024_04_15 {
  constructor(private usersService: UsersService) {}

  async createUserEventType(
    userId: number,
    body: Pick<CreateEventTypeInput_2024_04_15, "title" | "slug" | "length" | "hidden">
  ) {
    const { data } = await supabase
      .from("EventType")
      .insert({ ...body, userId, users: { id: userId } })
      .select("id")
      .single();

    return data;
  }
  // TODO: PrismaReadService
  async getEventTypeWithSeats(eventTypeId: number) {
    // return this.dbRead.prisma.eventType.findUnique({
    //   where: { id: eventTypeId },
    //   select: { users: { select: { id: true } }, seatsPerTimeSlot: true },
    // });
  }
  // TODO: PrismaReadService
  async getUserEventType(userId: number, eventTypeId: number) {
    // return this.dbRead.prisma.eventType.findFirst({
    //   where: {
    //     id: eventTypeId,
    //     userId,
    //   },
    // });
  }
  // TODO: PrismaReadService
  async getUserEventTypeForAtom(
    user: UserWithProfile,
    isUserOrganizationAdmin: boolean,
    eventTypeId: number
  ) {
    // return await getEventTypeById({
    //   currentOrganizationId: this.usersService.getUserMainOrgId(user),
    //   eventTypeId,
    //   userId: user.id,
    //   prisma: this.dbRead.prisma as unknown as PrismaClient,
    //   isUserOrganizationAdmin,
    //   isTrpcCall: true,
    // });
  }
  // TODO: PrismaReadService
  async getEventTypeById(eventTypeId: number) {
    // return this.dbRead.prisma.eventType.findUnique({ where: { id: eventTypeId } });
  }
  // TODO: PrismaReadService
  async getUserEventTypeBySlug(userId: number, slug: string) {
    // return this.dbRead.prisma.eventType.findUnique({
    //   where: {
    //     userId_slug: {
    //       userId: userId,
    //       slug: slug,
    //     },
    //   },
    // });
  }
  // TODO: PrismaWriteService
  async deleteEventType(eventTypeId: number) {
    // return this.dbWrite.prisma.eventType.delete({ where: { id: eventTypeId } });
  }
}
