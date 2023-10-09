import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import type { Calendar, CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

import { ZEventAppMetadata, ZAddRecordResponse } from "../zod";
import { getAirtableToken } from "./getAirtableToken";
import { fetchTables } from "./services";

export default class AirtableService implements Calendar {
  private integrationName = "";
  private log: typeof logger;
  private credential: CredentialPayload;

  constructor(credential: CredentialPayload) {
    this.integrationName = "airtable";
    this.log = logger.getChildLogger({ prefix: [`[[lib] ${this.integrationName}`] });
    this.credential = credential;
  }

  private async getToken(id: number) {
    return getAirtableToken(id);
  }

  private async addField(key: string, baseId: string, tableId: string, data: Record<string, string>) {
    const req = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables/${tableId}/fields`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-type": "application/json",
      },
      body: JSON.stringify(data),
    });

    return await req.json();
  }

  private async addRecord(key: string, baseId: string, tableId: string, data: Record<string, string>) {
    const req = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-type": "application/json",
      },
      body: JSON.stringify({
        fields: data,
        typecast: true,
      }),
    });

    return await req.json();
  }

  async createEvent(event: CalendarEvent) {
    try {
      if (!event.eventTypeId) {
        throw new Error("event type id not found");
      }

      if (!this.credential.userId) {
        throw new Error("user id not found");
      }
      const token = await this.getToken(this.credential.userId);
      const originalEvent = await prisma.eventType.findFirstOrThrow({
        where: {
          id: event.eventTypeId,
        },
        select: {
          metadata: true,
        },
      });

      const data = {
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location ?? "",
        attendees: event.attendees.map((person) => `${person.name} - ${person.email}`).toString(),
      };

      const fields = Object.keys(data);

      const {
        apps: {
          airtable: { baseId, tableId },
        },
      } = ZEventAppMetadata.parse(originalEvent.metadata);

      const tables = (await fetchTables(token.personalAccessToken, baseId)).tables;

      const currentTable = tables.find((table) => table.id === tableId);

      if (!currentTable) {
        throw new Error("table not found");
      }

      const currentFields = new Set(currentTable.fields.map((field) => field.name));
      const fieldsToCreate = new Set<string>();
      for (const field of fields) {
        const hasField = currentFields.has(field);
        if (!hasField) {
          fieldsToCreate.add(field);
        }
      }
      if (fieldsToCreate.size > 0) {
        const createFieldPromise: Promise<any>[] = [];
        fieldsToCreate.forEach((fieldName) => {
          createFieldPromise.push(
            this.addField(token.personalAccessToken, baseId, tableId, {
              name: fieldName,
              type: "singleLineText",
            })
          );
        });

        await Promise.all(createFieldPromise);
      }

      const addRecordReq = await this.addRecord(token.personalAccessToken, baseId, tableId, data);

      const airtableResponse = ZAddRecordResponse.parse(addRecordReq);

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
    } catch (error: any) {
      console.error(error);
      return Promise.reject(error?.message ?? "an unknown error occurred");
    }
  }

  async updateEvent() {
    return Promise.resolve([]);
  }

  async deleteEvent() {
    return Promise.resolve();
  }

  async getAvailability() {
    return Promise.resolve([]);
  }

  async listCalendars() {
    return Promise.resolve([]);
  }
}
