/**
 * ORM-agnostic interface for DestinationCalendarRepository
 * This interface defines the contract for destination calendar data access
 * Implementations can use Prisma, Kysely, or any other data access layer
 */

export interface DestinationCalendarDto {
  id: number;
  integration: string;
  externalId: string;
  primaryEmail: string | null;
  userId: number | null;
  eventTypeId: number | null;
  credentialId: number | null;
  delegationCredentialId: string | null;
}

export interface DestinationCalendarCreateInputDto {
  integration: string;
  externalId: string;
  primaryEmail?: string | null;
  userId?: number | null;
  eventTypeId?: number | null;
  credentialId?: number | null;
  delegationCredentialId?: string | null;
}

export interface DestinationCalendarUpdateInputDto {
  integration?: string;
  externalId?: string;
  primaryEmail?: string | null;
  credentialId?: number | null;
  delegationCredentialId?: string | null;
}

export interface IDestinationCalendarRepository {
  create(data: DestinationCalendarCreateInputDto): Promise<DestinationCalendarDto>;
  createIfNotExistsForUser(
    data: { userId: number } & DestinationCalendarCreateInputDto
  ): Promise<DestinationCalendarDto>;
  getByUserId(userId: number): Promise<DestinationCalendarDto | null>;
  getByEventTypeId(eventTypeId: number): Promise<DestinationCalendarDto | null>;
  find(where: {
    userId?: number | null;
    eventTypeId?: number | null;
    integration?: string;
    externalId?: string;
  }): Promise<DestinationCalendarDto | null>;
  upsert(params: {
    where: { id: number } | { eventTypeId: number } | { userId: number };
    update: DestinationCalendarUpdateInputDto;
    create: DestinationCalendarCreateInputDto;
  }): Promise<DestinationCalendarDto>;
}
