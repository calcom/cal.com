import type { PrismaClient } from "@calcom/prisma/client";
import type { IAuditActorRepository } from "./IAuditActorRepository";

const SYSTEM_ACTOR_ID = "00000000-0000-0000-0000-000000000000";

type Dependencies = {
    prismaClient: PrismaClient;
}
export class PrismaAuditActorRepository implements IAuditActorRepository {
    constructor(private readonly deps: Dependencies) { }
    async findByUserUuid(userUuid: string) {
        return this.deps.prismaClient.auditActor.findUnique({
            where: { userUuid },
        });
    }

    async findSystemActorOrThrow() {
        const actor = await this.deps.prismaClient.auditActor.findUnique({
            where: { id: SYSTEM_ACTOR_ID },
        });

        if (!actor) {
            throw new Error("System actor not found");
        }

        return actor;
    }

    async createIfNotExistsUserActor(params: { userUuid: string }) {
        return this.deps.prismaClient.auditActor.upsert({
            where: { userUuid: params.userUuid },
            create: {
                type: "USER",
                userUuid: params.userUuid,
            },
            update: {},
        });
    }

    async createIfNotExistsGuestActor(email: string | null, name: string | null, phone: string | null) {
        const normalizedEmail = email && email.trim() !== "" ? email : null;
        const normalizedName = name && name.trim() !== "" ? name : null;
        const normalizedPhone = phone && phone.trim() !== "" ? phone : null;

        // If all fields are null, we can't use upsert (no unique constraint), so just create a new record
        if (!normalizedEmail && !normalizedPhone) {
            return this.deps.prismaClient.auditActor.create({
                data: {
                    type: "GUEST",
                    email: null,
                    name: normalizedName,
                    phone: null,
                },
            });
        }

        // First try to find by email if email exists
        if (normalizedEmail) {
            const existingByEmail = await this.deps.prismaClient.auditActor.findUnique({
                where: { email: normalizedEmail },
            });

            if (existingByEmail) {
                // Update existing record found by email
                return this.deps.prismaClient.auditActor.update({
                    where: { email: normalizedEmail },
                    data: {
                        name: normalizedName ?? undefined,
                        phone: normalizedPhone ?? undefined,
                    },
                });
            }
        }

        // If not found by email and phone exists, try to find by phone
        if (normalizedPhone) {
            const existingByPhone = await this.deps.prismaClient.auditActor.findUnique({
                where: { phone: normalizedPhone },
            });

            if (existingByPhone) {
                // Update existing record found by phone
                return this.deps.prismaClient.auditActor.update({
                    where: { phone: normalizedPhone },
                    data: {
                        email: normalizedEmail ?? undefined,
                        name: normalizedName ?? undefined,
                    },
                });
            }
        }

        // Not found by either email or phone, create new record
        return this.deps.prismaClient.auditActor.create({
            data: {
                type: "GUEST",
                email: normalizedEmail,
                name: normalizedName,
                phone: normalizedPhone,
            },
        });
    }

    async findByAttendeeId(attendeeId: number) {
        return this.deps.prismaClient.auditActor.findUnique({
            where: { attendeeId },
        });
    }

}

