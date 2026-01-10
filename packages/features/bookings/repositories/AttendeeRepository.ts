import type { PrismaClient } from "@calcom/prisma";
import type { IAttendeeRepository } from "./IAttendeeRepository";

/**
 * Prisma-based implementation of IAttendeeRepository
 * 
 * This repository provides methods for looking up attendee information.
 */
export class AttendeeRepository implements IAttendeeRepository {
    constructor(private prismaClient: PrismaClient) {}

    async findById(id: number): Promise<{ name: string; email: string } | null> {
        const attendee = await this.prismaClient.attendee.findUnique({
            where: { id },
            select: {
                name: true,
                email: true,
            },
        });

        return attendee;
    }
}

