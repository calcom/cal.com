import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely/types";

import type {
  CalVideoSettingsDto,
  CalVideoSettingsInput,
  ICalVideoSettingsRepository,
} from "./ICalVideoSettingsRepository";

export class KyselyCalVideoSettingsRepository implements ICalVideoSettingsRepository {
  constructor(
    private readonly dbRead: Kysely<KyselyDatabase>,
    private readonly dbWrite: Kysely<KyselyDatabase>
  ) {}

  async deleteCalVideoSettings(eventTypeId: number): Promise<void> {
    await this.dbWrite.deleteFrom("CalVideoSettings").where("eventTypeId", "=", eventTypeId).execute();
  }

  async createCalVideoSettings(params: {
    eventTypeId: number;
    calVideoSettings: CalVideoSettingsInput;
  }): Promise<CalVideoSettingsDto> {
    const { eventTypeId, calVideoSettings } = params;

    const result = await this.dbWrite
      .insertInto("CalVideoSettings")
      .values({
        eventTypeId,
        disableRecordingForGuests: calVideoSettings.disableRecordingForGuests ?? false,
        disableRecordingForOrganizer: calVideoSettings.disableRecordingForOrganizer ?? false,
        enableAutomaticTranscription: calVideoSettings.enableAutomaticTranscription ?? false,
        enableAutomaticRecordingForOrganizer: calVideoSettings.enableAutomaticRecordingForOrganizer ?? false,
        disableTranscriptionForGuests: calVideoSettings.disableTranscriptionForGuests ?? false,
        disableTranscriptionForOrganizer: calVideoSettings.disableTranscriptionForOrganizer ?? false,
        redirectUrlOnExit: calVideoSettings.redirectUrlOnExit ?? null,
        requireEmailForGuests: calVideoSettings.requireEmailForGuests ?? false,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return this.mapToDto(result);
  }

  async createOrUpdateCalVideoSettings(params: {
    eventTypeId: number;
    calVideoSettings: CalVideoSettingsInput;
  }): Promise<CalVideoSettingsDto> {
    const { eventTypeId, calVideoSettings } = params;

    // Check if exists
    const existing = await this.dbRead
      .selectFrom("CalVideoSettings")
      .select("id")
      .where("eventTypeId", "=", eventTypeId)
      .executeTakeFirst();

    if (existing) {
      // Update
      const result = await this.dbWrite
        .updateTable("CalVideoSettings")
        .set({
          disableRecordingForGuests: calVideoSettings.disableRecordingForGuests ?? false,
          disableRecordingForOrganizer: calVideoSettings.disableRecordingForOrganizer ?? false,
          enableAutomaticTranscription: calVideoSettings.enableAutomaticTranscription ?? false,
          enableAutomaticRecordingForOrganizer: calVideoSettings.enableAutomaticRecordingForOrganizer ?? false,
          disableTranscriptionForGuests: calVideoSettings.disableTranscriptionForGuests ?? false,
          disableTranscriptionForOrganizer: calVideoSettings.disableTranscriptionForOrganizer ?? false,
          redirectUrlOnExit: calVideoSettings.redirectUrlOnExit ?? null,
          requireEmailForGuests: calVideoSettings.requireEmailForGuests ?? false,
          updatedAt: new Date(),
        })
        .where("eventTypeId", "=", eventTypeId)
        .returningAll()
        .executeTakeFirstOrThrow();

      return this.mapToDto(result);
    } else {
      // Create
      return this.createCalVideoSettings(params);
    }
  }

  private mapToDto(row: {
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
  }): CalVideoSettingsDto {
    return {
      id: row.id,
      eventTypeId: row.eventTypeId,
      disableRecordingForGuests: row.disableRecordingForGuests,
      disableRecordingForOrganizer: row.disableRecordingForOrganizer,
      enableAutomaticTranscription: row.enableAutomaticTranscription,
      enableAutomaticRecordingForOrganizer: row.enableAutomaticRecordingForOrganizer,
      disableTranscriptionForGuests: row.disableTranscriptionForGuests,
      disableTranscriptionForOrganizer: row.disableTranscriptionForOrganizer,
      redirectUrlOnExit: row.redirectUrlOnExit,
      requireEmailForGuests: row.requireEmailForGuests,
    };
  }
}
