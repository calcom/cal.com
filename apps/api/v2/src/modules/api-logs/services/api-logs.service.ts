import { Injectable } from "@nestjs/common";
import { GetApiLogsInput } from "../inputs/get-api-logs.input";
import { ApiLogsRepository } from "../api-logs.repository";
import { ApiLogsListOutput, ApiLogsStatsOutput } from "../outputs/api-log.output";

@Injectable()
export class ApiLogsService {
  constructor(private readonly repository: ApiLogsRepository) {}

  async findAll(filters: GetApiLogsInput, userId: number, organizationId?: number): Promise<ApiLogsListOutput> {
    const { startDate, endDate, statusCode, endpoint, isError, method, page = 1, perPage = 50 } = filters;

    const where: any = {
      OR: [{ userId }, { organizationId }],
    };

    if (startDate) where.timestamp = { ...where.timestamp, gte: new Date(startDate) };
    if (endDate) where.timestamp = { ...where.timestamp, lte: new Date(endDate) };
    if (statusCode) where.statusCode = statusCode;
    if (endpoint) where.endpoint = { contains: endpoint };
    if (isError !== undefined) where.isError = isError;
    if (method) where.method = method;

    const select = {
      id: true,
      requestId: true,
      method: true,
      endpoint: true,
      statusCode: true,
      responseTime: true,
      isError: true,
      timestamp: true,
      errorMessage: true,
    };

    const [logs, total] = await Promise.all([
      this.repository.findApiLogs(where, (page - 1) * perPage, perPage, select),
      this.repository.countApiLogs(where),
    ]);

    return {
      data: logs,
      pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
    };
  }

  async findOne(id: string, userId: number, organizationId?: number) {
    return this.repository.findOneApiLog({
      id,
      OR: [{ userId }, { organizationId }],
    });
  }

  async getStats(startDate: Date, endDate: Date, userId: number, organizationId?: number): Promise<ApiLogsStatsOutput> {
    const where: any = {
      timestamp: { gte: startDate, lte: endDate },
      OR: [{ userId }, { organizationId }],
    };

    const [totalCalls, errorCalls, avgResponseTime] = await Promise.all([
      this.repository.countApiLogs(where),
      this.repository.countApiLogs({ ...where, isError: true }),
      this.repository.aggregateResponseTime(where),
    ]);

    return {
      totalCalls,
      errorCalls,
      errorRate: totalCalls > 0 ? (errorCalls / totalCalls) * 100 : 0,
      avgResponseTime: avgResponseTime._avg.responseTime || 0,
    };
  }

  async cleanup(retentionDays: number) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    return this.repository.deleteOldLogs(cutoffDate);
  }
}
