import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@calcom/prisma/client";

@Injectable()
export class ApiLogsRepository {
  private readonly prisma = new PrismaClient();

  async findApiLogs(where: any, skip: number, take: number, select: any) {
    return this.prisma.apiCallLog.findMany({ where, skip, take, select, orderBy: { timestamp: "desc" } });
  }

  async countApiLogs(where: any) {
    return this.prisma.apiCallLog.count({ where });
  }

  async findOneApiLog(where: any) {
    return this.prisma.apiCallLog.findFirst({ where });
  }

  async aggregateResponseTime(where: any) {
    return this.prisma.apiCallLog.aggregate({ where, _avg: { responseTime: true } });
  }

  async deleteOldLogs(cutoffDate: Date) {
    return this.prisma.apiCallLog.deleteMany({ where: { timestamp: { lt: cutoffDate } } });
  }
}
