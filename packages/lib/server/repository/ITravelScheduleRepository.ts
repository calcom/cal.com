/**
 * ORM-agnostic interface for TravelScheduleRepository
 * This interface defines the contract for travel schedule data access
 * Implementations can use Prisma, Kysely, or any other data access layer
 */

export interface TravelScheduleDto {
  id: number;
  startDate: Date | null;
  endDate: Date | null;
  timeZone: string;
}

export interface ITravelScheduleRepository {
  findTravelSchedulesByUserId(userId: number): Promise<TravelScheduleDto[]>;
}
