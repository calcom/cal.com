import type { BookingAudit, Prisma } from "@calcom/prisma/client";
import type { PrismaClient } from "@calcom/prisma";
import prisma from "@calcom/prisma";

import { BookingAuditDataSchema } from "../schemas/BookingAuditDataSchema";
import type { IBookingAuditRepository } from "./IBookingAuditRepository";

export class PrismaBookingAuditRepository implements IBookingAuditRepository {
    constructor(private readonly prismaClient: PrismaClient = prisma) { }

    async create(bookingAudit: Prisma.BookingAuditCreateInput): Promise<BookingAudit> {
        // Validate data against union schema at write time
        if (bookingAudit.data !== null && bookingAudit.data !== undefined) {
            // Type guard: check if it's an object with string keys
            if (typeof bookingAudit.data === 'object' && !Array.isArray(bookingAudit.data)) {
                // Extract version if it exists, keeping the rest for validation
                const entries = Object.entries(bookingAudit.data);
                const dataWithoutVersion: Record<string, unknown> = {};

                for (const [key, value] of entries) {
                    if (key !== 'version') {
                        dataWithoutVersion[key] = value;
                    }
                }

                const validationResult = BookingAuditDataSchema.safeParse(dataWithoutVersion);
                if (!validationResult.success) {
                    throw new Error(
                        `Invalid audit data for action ${bookingAudit.action}: ${validationResult.error.message}`
                    );
                }
            }
        }

        return this.prismaClient.bookingAudit.create({
            data: bookingAudit,
        });
    }
}

