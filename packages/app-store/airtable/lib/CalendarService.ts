import dayjs from "@calcom/dayjs";
import { formatToLocalizedDate } from "@calcom/lib/date-fns";
import getLabelValueMapFromResponses from "@calcom/lib/getLabelValueMapFromResponses";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import type { Calendar, CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

import { ZEventAppMetadata, ZAddOrUpdateRecordResponse, appKeysSchema } from "../zod";
import { fetchTables, addRecord, createMissingFields, deleteRecord, updateRecord } from "./services";

export default class AirtableService implements Calendar {
  private integrationName = "";
  private log: typeof logger;
  private credential: CredentialPayload;

  constructor(credential: CredentialPayload) {
    this.integrationName = "airtable";
    this.log = logger.getChildLogger({ prefix: [`[[lib] ${this.integrationName}`] });
    this.credential = credential;
  }

  private getToken() {
    return appKeysSchema.parse(this.credential.key);
  }

  private async getAppData(bookingId?: string | null) {
    if (!bookingId) {
      throw new Error("booking id not found");
    }

    const originalEvent = await prisma.booking.findFirstOrThrow({
      where: {
        uid: bookingId,
      },
      select: {
        eventType: {
          select: {
            metadata: true,
          },
        },
      },
    });

    const {
      apps: {
        airtable: { baseId, tableId },
      },
    } = ZEventAppMetadata.parse(originalEvent.eventType?.metadata);

    return { baseId, tableId };
  }

  private getTableData(event: CalendarEvent) {
    const tz = event.organizer.timeZone;
    const language = event.organizer.language.locale;
    const date = formatToLocalizedDate(dayjs.tz(event.startTime, tz), language, "medium", tz);
    const startTime = dayjs(event.startTime).tz(tz).format(event.organizer.timeFormat);
    const endTime = dayjs(event.endTime).tz(tz).format(event.organizer.timeFormat);
    const labelValueMap = getLabelValueMapFromResponses(event);

    const data = {
      Title: event.title,
      "Start time": `${startTime} - ${date}`,
      "End time": `${endTime} - ${date}`,
      Location: event.location ?? "",
      Attendees: event.attendees.map((person) => `${person.name} - ${person.email}`).toString(),
      ...(event.additionalNotes && {
        "Additional notes": event.additionalNotes,
      }),
    };

    return data;
  }

  async createEvent(event: CalendarEvent) {
    try {
      const { baseId, tableId } = await this.getAppData(event?.uid);

      const token = this.getToken();

      const data = this.getTableData(event);
      const fields = Object.keys(data);

      const tables = (await fetchTables(token.personalAccessToken, baseId)).tables;

      const currentTable = tables.find((table) => table.id === tableId);

      if (!currentTable) {
        throw new Error("table not found");
      }

      await createMissingFields({
        table: currentTable,
        fields,
        token,
        baseId,
        tableId,
      });

      const addRecordReq = await addRecord({
        baseId,
        tableId,
        data,
        key: token.personalAccessToken,
      });

      const airtableResponse = ZAddOrUpdateRecordResponse.parse(addRecordReq);

      return Promise.resolve({
        id: airtableResponse.id,
        uid: airtableResponse.id,
        type: this.integrationName,
        password: "",
        url: "",
        additionalInfo: {
          airtableResponse,
        },
      });
    } catch (error) {
      this.log.error("meeting:creation:notOk", { error });
      return Promise.reject("an unknown error occurred");
    }
  }

  async updateEvent(uid: string, event: CalendarEvent) {
    try {
      const { baseId, tableId } = await this.getAppData(event?.uid);
      const data = this.getTableData(event);
      const token = this.getToken();

      const addRecordReq = await updateRecord({
        baseId,
        tableId,
        data,
        key: token.personalAccessToken,
        recordId: uid,
      });

      const airtableResponse = ZAddOrUpdateRecordResponse.parse(addRecordReq);

      return Promise.resolve({
        id: airtableResponse.id,
        uid: airtableResponse.id,
        type: this.integrationName,
        password: "",
        url: "",
        additionalInfo: {
          airtableResponse,
        },
      });
    } catch (error) {
      this.log.error("meeting:update:notOk", { error });
      return Promise.reject("an unknown error occurred");
    }
    return Promise.resolve([]);
  }

  async deleteEvent(uid: string, event: CalendarEvent) {
    try {
      const token = this.getToken();
      const { baseId, tableId } = await this.getAppData(event?.uid);
      const { req } = await deleteRecord({
        baseId,
        tableId,
        recordId: uid,
        key: token.personalAccessToken,
      });

      if (req.ok) {
        Promise.resolve("Deleted airtable record");
      } else {
        Promise.reject("Error deleting airtable record");
      }
    } catch (error) {
      this.log.error("meeting:deletion:notOk", { error });
      return Promise.reject("an unknown error occurred");
    }
  }

  async getAvailability() {
    return Promise.resolve([]);
  }

  async listCalendars() {
    return Promise.resolve([]);
  }
}
