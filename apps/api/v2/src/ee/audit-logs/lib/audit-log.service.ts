import { AuditLogPayload } from "@/ee/audit-logs/lib/audit-log.events";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaWriteService } from "src/modules/prisma/prisma-write.service";

export abstract class AuditLogService {
  abstract log(payload: AuditLogPayload): Promise<void>;
}

@Injectable()
export class PrismaAuditLogService extends AuditLogService {
  // Injecting the PrismaWriteService class
  constructor(private readonly prismaWriteService: PrismaWriteService) {
    super();
  }

  async log(payload: AuditLogPayload): Promise<void> {
    await this.prismaWriteService.prisma.auditLog.create({
      data: {
        teamId: payload.teamId,
        actorId: payload.actorId,
        action: payload.action,
        targetType: payload.targetType,
        targetId: payload.targetId,
        metadata: (payload.metadata || {}) as Prisma.InputJsonValue,
      },
    });
  }
}
