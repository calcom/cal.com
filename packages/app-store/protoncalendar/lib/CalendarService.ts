import { z } from "zod";
import { ics } from "calendar-link";

import { symmetricDecrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { Calendar, CalendarEvent, NewCalendarEventType, EventType } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

const log = logger.getSubLogger({ prefix: ["[proton-calendar]"] });

export class ProtonCalendarService implements Calendar {
  private url: string;

  constructor(credential: CredentialPayload) {
    this.url = credential.key?.protonIcsFeedUrl || "";
  }

  async getAvailability(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: { externalId: string }[]
  ): Promise<{ start: string; end: string }[]> {
    if (!this.url) {
      log.warn("Proton Calendar ICS feed URL not configured");
      return [];
    }

    try {
      // Fetch ICS feed from Proton Calendar
      const response = await fetch(this.url, {
        headers: {
          Accept: "text/calendar",
        },
      });

      if (!response.ok) {
        log.warn("Failed to fetch Proton Calendar ICS feed", { status: response.status });
        return [];
      }

      const icsData = await response.text();
      
      // Parse ICS and extract events
      const events = this.parseICS(icsData, dateFrom, dateTo);
      
      return events.map((event) => ({
        start: event.start,
        end: event.end,
      }));
    } catch (error) {
      log.error("Error fetching Proton Calendar availability", error);
      return [];
    }
  }

  private parseICS(icsData: string, dateFrom: string, dateTo: string): { start: string; end: string }[] {
    // Simple ICS parser - extract VEVENT blocks
    const events: { start: string; end: string }[] = [];
    const lines = icsData.split("\n");
    
    let inEvent = false;
    let currentEvent: { start?: string; end?: string } = {};

    for (const line of lines) {
      if (line.startsWith("BEGIN:VEVENT")) {
        inEvent = true;
        currentEvent = {};
      } else if (line.startsWith("END:VEVENT")) {
        if (currentEvent.start && currentEvent.end) {
          // Check if event is within the requested date range
          if (currentEvent.start >= dateFrom && currentEvent.start <= dateTo) {
            events.push(currentEvent as { start: string; end: string });
          }
        }
        inEvent = false;
      } else if (inEvent) {
        if (line.startsWith("DTSTART:")) {
          currentEvent.start = this.parseICSDate(line.substring(8));
        } else if (line.startsWith("DTEND:")) {
          currentEvent.end = this.parseICSDate(line.substring(6));
        } else if (line.startsWith("DURATION:")) {
          // Handle duration if end is not specified
          if (!currentEvent.end && currentEvent.start) {
            currentEvent.end = currentEvent.start; // Simplified - just use start as end
          }
        }
      }
    }

    return events;
  }

  private parseICSDate(dateStr: string): string {
    // Remove any timezone suffix
    const cleanDate = dateStr.replace(/Z$/, "");
    
    // Parse ICS date format (YYYYMMDD or YYYYMMDDTHHMMSS)
    if (cleanDate.length === 8) {
      // Date only (YYYYMMDD)
      const year = cleanDate.substring(0, 4);
      const month = cleanDate.substring(4, 6);
      const day = cleanDate.substring(6, 8);
      return `${year}-${month}-${day}T00:00:00Z`;
    } else if (cleanDate.length >= 15) {
      // DateTime (YYYYMMDDTHHMMSS)
      const year = cleanDate.substring(0, 4);
      const month = cleanDate.substring(4, 6);
      const day = cleanDate.substring(6, 8);
      const hour = cleanDate.substring(9, 11);
      const minute = cleanDate.substring(11, 13);
      const second = cleanDate.substring(13, 15);
      return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
    }
    
    // Fallback
    return new Date().toISOString();
  }

  async createEvent(event: CalendarEvent, credentialId: number): Promise<NewCalendarEventType> {
    // Proton Calendar integration is read-only via ICS feed
    // We cannot create events via ICS
    log.warn("Proton Calendar is read-only. Cannot create events.");
    
    return {
      type: "proton_calendar",
      id: `proton-${Date.now()}`,
      uid: `proton-${Date.now()}`,
      password: "",
      url: "",
      additionalInfo: {},
    };
  }

  async updateEvent(
    uid: string,
    event: CalendarEvent
  ): Promise<NewCalendarEventType> {
    log.warn("Proton Calendar is read-only. Cannot update events.");
    
    return {
      type: "proton_calendar",
      id: uid,
      uid,
      password: "",
      url: "",
      additionalInfo: {},
    };
  }

  async deleteEvent(uid: string): Promise<void> {
    log.warn("Proton Calendar is read-only. Cannot delete events.");
    // No-op for read-only calendar
  }
}
