import type { PrismaClient } from "@calcom/prisma/client";
import type { IAuditActorRepository } from "./IAuditActorRepository";

type Dependencies = {
  prismaClient: PrismaClient;
};
export class PrismaAuditActorRepository implements IAuditActorRepository {
  constructor(private readonly deps: Dependencies) {}
  async findByUserUuid(userUuid: string) {
    return this.deps.prismaClient.auditActor.findUnique({
      where: { userUuid },
    });
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

  async createIfNotExistsGuestActor(params: {
    email: string | null;
    name: string | null;
    phone: string | null;
  }) {
    const { email, name, phone } = params;
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

  async createIfNotExistsAttendeeActor(params: { attendeeId: number }) {
    return this.deps.prismaClient.auditActor.upsert({
      where: { attendeeId: params.attendeeId },
      create: {
        type: "ATTENDEE",
        attendeeId: params.attendeeId,
      },
      update: {},
    });
  }

  async createIfNotExistsAppActor(params: { credentialId: number } | { email: string; name: string }) {
    if ("credentialId" in params) {
      return this.deps.prismaClient.auditActor.upsert({
        where: { credentialId: params.credentialId },
        create: {
          type: "APP",
          credentialId: params.credentialId,
        },
        update: {},
      });
    }

    return this.deps.prismaClient.auditActor.upsert({
      where: { email: params.email },
      create: {
        type: "APP",
        email: params.email,
        name: params.name,
      },
      update: {},
    });
  }
}
