import type { GoogleSheetsCredential } from "./SheetsService";
import GoogleSheetsService from "./SheetsService";

export { GoogleSheetsCredential };

export interface SpreadsheetFile {
  id: string;
  name: string;
  spreadsheetId?: string;
  properties?: {
    title?: string;
  };
}

export interface SpreadsheetResponse {
  spreadsheetId?: string;
  properties?: {
    title?: string;
  };
}

/**
 * Wrapper for GoogleSheetsService that doesn't expose Google API types
 * This helps avoid type reference issues in the tRPC router
 */
export default class GoogleSheetsServiceWrapper {
  private service: GoogleSheetsService;

  constructor(credential: GoogleSheetsCredential) {
    this.service = new GoogleSheetsService(credential);
  }

  async listSpreadsheets(): Promise<SpreadsheetFile[]> {
    try {
      const files = await this.service.listSpreadsheets();

      if (!Array.isArray(files)) {
        return [];
      }

      const result: SpreadsheetFile[] = [];
      for (const file of files) {
        if (file && typeof file === "object") {
          result.push({
            id: typeof file.id === "string" ? file.id : String(file.id || ""),
            name: typeof file.name === "string" ? file.name : String(file.name || ""),
            spreadsheetId: file.id ? String(file.id) : undefined,
            properties: file.properties
              ? {
                  title: file.properties.title ? String(file.properties.title) : undefined,
                }
              : undefined,
          });
        }
      }

      return result;
    } catch (error) {
      console.error("Error listing spreadsheets:", error);
      throw error;
    }
  }

  async createSpreadsheet(title: string): Promise<SpreadsheetResponse> {
    try {
      const response = await this.service.createSpreadsheet(title);

      return {
        spreadsheetId: response.spreadsheetId ? String(response.spreadsheetId) : undefined,
        properties: response.properties
          ? {
              title: response.properties.title ? String(response.properties.title) : undefined,
            }
          : undefined,
      };
    } catch (error) {
      console.error("Error creating spreadsheet:", error);
      throw error;
    }
  }

  async setupBookingSheet(spreadsheetId: string): Promise<boolean> {
    try {
      return await this.service.setupBookingSheet(spreadsheetId);
    } catch (error) {
      console.error("Error setting up booking sheet:", error);
      throw error;
    }
  }

  async appendBookingRow(spreadsheetId: string, bookingData: any[]): Promise<{ spreadsheetId?: string }> {
    try {
      const response = await this.service.appendBookingRow(spreadsheetId, bookingData);

      // Return a clean object without Google API types
      return {
        spreadsheetId: response?.spreadsheetId ? String(response.spreadsheetId) : undefined,
      };
    } catch (error) {
      console.error("Error appending booking row:", error);
      throw error;
    }
  }
}
