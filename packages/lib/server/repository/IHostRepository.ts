/**
 * ORM-agnostic interface for HostRepository
 * This interface defines the contract for host data access
 * Implementations can use Prisma, Kysely, or any other data access layer
 */

export interface HostDto {
  id: number;
  userId: number;
  eventTypeId: number;
  isFixed: boolean;
  priority: number | null;
  weight: number | null;
  weightAdjustment: number | null;
  scheduleId: number | null;
  createdAt: Date;
}

export interface IHostRepository {
  updateHostsSchedule(userId: number, oldScheduleId: number, newScheduleId: number): Promise<{ count: number }>;
  findHostsCreatedInInterval(params: {
    eventTypeId: number;
    userIds: number[];
    startDate: Date;
  }): Promise<HostDto[]>;
}
