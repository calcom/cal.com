import { sheets_v4 } from "@googleapis/sheets";
import type { Credentials } from "google-auth-library";
import { OAuth2Client } from "googleapis-common";

import { WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { getGoogleSheetsAppKeys } from "./getGoogleSheetsAppKeys";

export class GoogleSheetsService {
  private oAuth2Client?: OAuth2Client;
  private sheets?: sheets_v4.Sheets;

  constructor(private credentials: Credentials) {}
  async initializeClient() {
    const { client_id, client_secret } = await getGoogleSheetsAppKeys();
    const redirect_uri = `${WEBAPP_URL_FOR_OAUTH}/api/integrations/googlesheets/callback`;
    this.oAuth2Client = new OAuth2Client(client_id, client_secret, redirect_uri);

    this.oAuth2Client?.setCredentials(this.credentials);
    this.sheets = new sheets_v4.Sheets({ auth: this.oAuth2Client });
    return this;
  }

  /**
   * Extract spreadsheet ID from Google Sheets URL
   */
  extractSpreadsheetId(url: string): string | null {
    const regex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  /**
   * Validate if the spreadsheet URL is accessible
   */
  async validateSpreadsheetAccess(spreadsheetId: string): Promise<boolean> {
    try {
      await this.sheets?.spreadsheets.get({
        spreadsheetId,
        fields: "properties.title",
      });
      return true;
    } catch (error) {
      logger.error("Failed to access spreadsheet", { spreadsheetId, error });
      return false;
    }
  }

  /**
   * Get or create headers in the first row
   */
  private async ensureHeaders(spreadsheetId: string): Promise<void> {
    const headers = [
      "Booking ID",
      "Event Type",
      "Title",
      "Start Time",
      "End Time",
      "Duration (minutes)",
      "Organizer Name",
      "Organizer Email",
      "Attendee Names",
      "Attendee Emails",
      "Location",
      "Description",
      "Custom Inputs",
      "Responses",
      "User Field Responses",
      "Payment Info",
      "Team Name",
      "Team Members",
      "Recurring Event",
      "Recurrence",
      "Seats Per Time Slot",
      "Seats Show Attendees",
      "Attendee Seat ID",
      "Requires Confirmation",
      "Scheduling Type",
      "Status",
      "Created At",
      "Updated At",
    ];

    try {
      // Check if headers already exist
      const response = await this.sheets?.spreadsheets.values.get({
        spreadsheetId,
        range: "A1:AB1",
      });

      if (!response?.data.values || response?.data.values.length === 0) {
        // Create headers
        await this.sheets?.spreadsheets.values.update({
          spreadsheetId,
          range: "A1",
          valueInputOption: "RAW",
          requestBody: {
            values: [headers],
          },
        });
      }
    } catch (error) {
      logger.error("Failed to ensure headers", { spreadsheetId, error });
      throw error;
    }
  }

  /**
   * Find existing booking row by booking ID
   */
  private async findBookingRow(spreadsheetId: string, bookingId: number): Promise<number | null> {
    try {
      const response = await this.sheets?.spreadsheets.values.get({
        spreadsheetId,
        range: "A:A",
      });

      if (!response?.data.values) return null;

      for (let i = 1; i < response.data.values.length; i++) {
        if (response.data.values[i][0] === bookingId.toString()) {
          return i + 1; // Return 1-based row number
        }
      }
      return null;
    } catch (error) {
      logger.error("Failed to find booking row", { spreadsheetId, bookingId, error });
      return null;
    }
  }

  /**
   * Transform CalendarEvent to spreadsheet row data
   */
  private transformEventToRowData(event: CalendarEvent): any[] {
    const attendeeNames = event.attendees.map((a) => a.name).join(", ");
    const attendeeEmails = event.attendees.map((a) => a.email).join(", ");
    const teamMembers = event.team?.members.map((m) => `${m.name} (${m.email})`).join(", ") || "";

    return [
      event.bookingId || "",
      event.type || "",
      event.title || "",
      event.startTime || "",
      event.endTime || "",
      event.length || "",
      event.organizer.name || "",
      event.organizer.email || "",
      attendeeNames,
      attendeeEmails,
      event.location || "",
      event.description || "",
      JSON.stringify(event.customInputs || {}),
      JSON.stringify(event.responses || {}),
      JSON.stringify(event.userFieldsResponses || {}),
      JSON.stringify(event.paymentInfo || {}),
      event.team?.name || "",
      teamMembers,
      JSON.stringify(event.recurringEvent || {}),
      event.recurrence || "",
      event.seatsPerTimeSlot || "",
      event.seatsShowAttendees || "",
      event.attendeeSeatId || "",
      event.requiresConfirmation || "",
      event.schedulingType || "",
      "active", // Default status
      new Date().toISOString(),
      new Date().toISOString(),
    ];
  }

  /**
   * Export booking data to Google Sheets
   */
  async exportBookingData(spreadsheetId: string, event: CalendarEvent): Promise<void> {
    try {
      await this.ensureHeaders(spreadsheetId);

      const rowData = this.transformEventToRowData(event);

      if (event.bookingId) {
        // Try to find existing row
        const existingRow = await this.findBookingRow(spreadsheetId, event.bookingId);

        if (existingRow) {
          // Update existing row
          await this.sheets?.spreadsheets.values.update({
            spreadsheetId,
            range: `A${existingRow}:AB${existingRow}`,
            valueInputOption: "RAW",
            requestBody: {
              values: [rowData],
            },
          });
        } else {
          // Append new row
          await this.sheets?.spreadsheets.values.append({
            spreadsheetId,
            range: "A:AB",
            valueInputOption: "RAW",
            requestBody: {
              values: [rowData],
            },
          });
        }
      } else {
        // No booking ID, just append
        await this.sheets?.spreadsheets.values.append({
          spreadsheetId,
          range: "A:AB",
          valueInputOption: "RAW",
          requestBody: {
            values: [rowData],
          },
        });
      }

      logger.info("Successfully exported booking data to Google Sheets", {
        spreadsheetId,
        bookingId: event.bookingId,
      });
    } catch (error) {
      logger.error("Failed to export booking data", { spreadsheetId, error });
      throw error;
    }
  }
}

export default GoogleSheetsService;
