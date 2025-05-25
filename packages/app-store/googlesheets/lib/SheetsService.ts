import { drive_v3 } from "@googleapis/drive";
import { sheets_v4 } from "@googleapis/sheets";
import { OAuth2Client } from "googleapis-common";

import { getGoogleSheetsAppKeys } from "./getGoogleSheetsAppKeys";

export interface GoogleSheetsCredentialData {
  refresh_token: string;
  expiry_date: number;
  access_token: string;
  token_type: string;
  scope: string;
}

export interface GoogleSheetsCredential {
  key: GoogleSheetsCredentialData;
  id: number;
  type: string;
  userId: number | null;
}

export default class GoogleSheetsService {
  private sheetsClient: sheets_v4.Sheets;
  private driveClient: drive_v3.Drive;
  private credential: GoogleSheetsCredential;

  constructor(credential: GoogleSheetsCredential) {
    this.credential = credential;
    const googleSheetsAppKeys = getGoogleSheetsAppKeys();
    const client_id = googleSheetsAppKeys.client_id;
    const client_secret = googleSheetsAppKeys.client_secret;
    const oauth2Client = new OAuth2Client({
      clientId: client_id,
      clientSecret: client_secret,
    });

    oauth2Client.setCredentials({
      refresh_token: credential.key.refresh_token,
      access_token: credential.key.access_token,
    });

    this.sheetsClient = new sheets_v4.Sheets({ auth: oauth2Client });
    this.driveClient = new drive_v3.Drive({ auth: oauth2Client });
  }

  async listSpreadsheets() {
    try {
      const response = await this.driveClient.files.list({
        q: "mimeType='application/vnd.google-apps.spreadsheet'",
        fields: "files(id, name)",
      });
      return response.data.files || [];
    } catch (error) {
      console.error("Error listing spreadsheets:", error);
      throw error;
    }
  }

  async createSpreadsheet(title: string) {
    try {
      const response = await this.sheetsClient.spreadsheets.create({
        requestBody: {
          properties: {
            title,
          },
          sheets: [
            {
              properties: {
                title: "Bookings",
              },
            },
          ],
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error creating spreadsheet:", error);
      throw error;
    }
  }

  async setupBookingSheet(spreadsheetId: string) {
    try {
      await this.sheetsClient.spreadsheets.values.update({
        spreadsheetId,
        range: "Bookings!A1:K1",
        valueInputOption: "RAW",
        requestBody: {
          values: [
            [
              "Booking ID",
              "Event Type",
              "Attendee Name",
              "Attendee Email",
              "Start Time",
              "End Time",
              "Status",
              "Location",
              "Notes",
              "Created At",
              "Updated At",
            ],
          ],
        },
      });

      await this.sheetsClient.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: 0,
                  startRowIndex: 0,
                  endRowIndex: 1,
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: {
                      red: 0.2,
                      green: 0.2,
                      blue: 0.2,
                    },
                    textFormat: {
                      foregroundColor: {
                        red: 1.0,
                        green: 1.0,
                        blue: 1.0,
                      },
                      bold: true,
                    },
                  },
                },
                fields: "userEnteredFormat(backgroundColor,textFormat)",
              },
            },
          ],
        },
      });

      return true;
    } catch (error) {
      console.error("Error setting up booking sheet:", error);
      throw error;
    }
  }

  async appendBookingRow(spreadsheetId: string, bookingData: any[]) {
    try {
      const response = await this.sheetsClient.spreadsheets.values.append({
        spreadsheetId,
        range: "Bookings!A:K",
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: [bookingData],
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error appending booking row:", error);
      throw error;
    }
  }
}
