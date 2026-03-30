import type { PrismaClient } from "@calcom/prisma";

import type { AuditTargetType } from "../types/auditTarget";
import type {
  AuditEvent,
  IAuditEventRepository,
  AuditEventCreateInput,
  PaginatedAuditEvents,
} from "./IAuditEventRepository";

type Dependencies = {
  prismaClient: PrismaClient;
};

const safeActorSelect = {
  id: true,
  type: true,
  userUuid: true,
  name: true,
  createdAt: true,
} as const;

const viewerSelect = {
  id: true,
  actorId: true,
  action: true,
  result: true,
  source: true,
  targetType: true,
  targetId: true,
  previousValue: true,
  newValue: true,
  createdAt: true,
  impersonatedBy: true,
  deliveredAt: true,
} as const;

export class PrismaAuditEventRepository implements IAuditEventRepository {
  constructor(private readonly deps: Dependencies) {}

  async create(auditEvent: AuditEventCreateInput): Promise<AuditEvent> {
    const result = await this.deps.prismaClient.auditEvent.create({ data: auditEvent });
    return result as AuditEvent;
  }

  async createMany(auditEvents: AuditEventCreateInput[]) {
    const result = await this.deps.prismaClient.auditEvent.createMany({
      data: auditEvents,
    });
    return { count: result.count };
  }

  private async findPaginated(
    where: Record<string, unknown>,
    limit: number,
    offset: number
  ): Promise<PaginatedAuditEvents> {
    const [rows, totalRowCount] = await Promise.all([
      this.deps.prismaClient.auditEvent.findMany({
        where,
        select: {
          ...viewerSelect,
          actor: { select: safeActorSelect },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      this.deps.prismaClient.auditEvent.count({ where }),
    ]);

    return { rows, meta: { totalRowCount } };
  }

  async findByOrgId(orgId: number, limit: number, offset: number): Promise<PaginatedAuditEvents> {
    return this.findPaginated({ orgId }, limit, offset);
  }

  async findByActorId(actorId: string, limit: number, offset: number): Promise<PaginatedAuditEvents> {
    return this.findPaginated({ actorId }, limit, offset);
  }

  async findByTargetTypeAndId(
    targetType: AuditTargetType,
    targetId: string,
    limit: number,
    offset: number
  ): Promise<PaginatedAuditEvents> {
    return this.findPaginated({ targetType, targetId }, limit, offset);
  }
}
