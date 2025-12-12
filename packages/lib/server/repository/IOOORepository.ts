/**
 * ORM-agnostic interface for OOORepository (Out of Office)
 * This interface defines the contract for out of office data access
 * Implementations can use Prisma, Kysely, or any other data access layer
 */

export interface OOOEntryDto {
  id: number;
  start: Date;
  end: Date;
  notes: string | null;
  showNotePublicly: boolean;
  user: {
    id: number;
    name: string | null;
  };
  toUser: {
    id: number;
    username: string | null;
    name: string | null;
  } | null;
  reason: {
    id: number;
    emoji: string;
    reason: string;
  } | null;
}

export interface OOOEntryIntervalDto {
  start: Date;
  end: Date;
  userId: number;
}

export interface IOOORepository {
  findManyOOO(params: {
    startTimeDate: Date;
    endTimeDate: Date;
    allUserIds: number[];
  }): Promise<OOOEntryDto[]>;

  findUserOOODays(params: {
    userId: number;
    dateTo: string;
    dateFrom: string;
  }): Promise<OOOEntryDto[]>;

  findOOOEntriesInInterval(params: {
    userIds: number[];
    startDate: Date;
    endDate: Date;
  }): Promise<OOOEntryIntervalDto[]>;
}
