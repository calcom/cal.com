/**
 * ORM-agnostic interface for CalVideoSettingsRepository
 * This interface defines the contract for Cal Video settings data access
 * Implementations can use Prisma, Kysely, or any other data access layer
 */

export interface CalVideoSettingsDto {
  id: number;
  eventTypeId: number;
  disableRecordingForGuests: boolean;
  disableRecordingForOrganizer: boolean;
  enableAutomaticTranscription: boolean;
  enableAutomaticRecordingForOrganizer: boolean;
  disableTranscriptionForGuests: boolean;
  disableTranscriptionForOrganizer: boolean;
  redirectUrlOnExit: string | null;
  requireEmailForGuests: boolean;
}

export interface CalVideoSettingsInput {
  disableRecordingForGuests?: boolean | null;
  disableRecordingForOrganizer?: boolean | null;
  enableAutomaticTranscription?: boolean | null;
  enableAutomaticRecordingForOrganizer?: boolean | null;
  disableTranscriptionForGuests?: boolean | null;
  disableTranscriptionForOrganizer?: boolean | null;
  redirectUrlOnExit?: string | null;
  requireEmailForGuests?: boolean | null;
}

export interface ICalVideoSettingsRepository {
  deleteCalVideoSettings(eventTypeId: number): Promise<void>;

  createCalVideoSettings(params: {
    eventTypeId: number;
    calVideoSettings: CalVideoSettingsInput;
  }): Promise<CalVideoSettingsDto>;

  createOrUpdateCalVideoSettings(params: {
    eventTypeId: number;
    calVideoSettings: CalVideoSettingsInput;
  }): Promise<CalVideoSettingsDto>;
}
