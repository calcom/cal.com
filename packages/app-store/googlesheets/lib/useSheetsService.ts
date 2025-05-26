import { useEffect, useState } from "react";

import { trpc } from "@calcom/trpc/react";

import type { SpreadsheetFile } from "./SheetsService.wrapper";

export type { SpreadsheetFile };

interface SheetsServiceHook {
  isLoading: boolean;
  spreadsheets: SpreadsheetFile[];
  createSpreadsheet: (title: string) => Promise<SpreadsheetFile | null>;
  setupBookingSheet: (spreadsheetId: string) => Promise<boolean>;
  refreshSpreadsheets: () => Promise<SpreadsheetFile[]>;
}

export const useSheetsService = (credentials: any[]): SheetsServiceHook => {
  const [credentialId, setCredentialId] = useState<number | null>(null);
  const [spreadsheets, setSpreadsheets] = useState<SpreadsheetFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Get the tRPC hooks
  const utils = trpc.useContext();

  const listSpreadsheetsQuery = trpc.viewer.googleSheets.listSpreadsheets.useQuery(
    { credentialId: credentialId || 0 },
    { enabled: !!credentialId }
  );

  const createSpreadsheetMutation = trpc.viewer.googleSheets.createSpreadsheet.useMutation({
    onSuccess: (data) => {
      if (data && typeof data === "object" && "spreadsheetId" in data) {
        const spreadsheetId =
          typeof data.spreadsheetId === "string" ? data.spreadsheetId : String(data.spreadsheetId || "");

        let title = "";
        if ("properties" in data && data.properties && typeof data.properties === "object") {
          if ("title" in data.properties && data.properties.title) {
            title =
              typeof data.properties.title === "string"
                ? data.properties.title
                : String(data.properties.title || "");
          }
        }

        const newSheet: SpreadsheetFile = {
          id: spreadsheetId,
          name: title || "Untitled Spreadsheet",
          spreadsheetId: spreadsheetId,
          properties: {
            title: title || "Untitled Spreadsheet",
          },
        };

        setSpreadsheets((prev) => [...prev, newSheet]);
      }
    },
  });

  const setupBookingSheetMutation = trpc.viewer.googleSheets.setupBookingSheet.useMutation();

  // Set credential ID when credentials change
  useEffect(() => {
    if (credentials?.length > 0) {
      setCredentialId(credentials[0].id);
    }
  }, [credentials]);

  // Load spreadsheets when credential ID changes
  useEffect(() => {
    if (credentialId) {
      refreshSpreadsheets();
    }
  }, [credentialId]);

  // Process spreadsheet list data
  function processSpreadsheetList(data: any[] | undefined): SpreadsheetFile[] {
    if (!Array.isArray(data)) {
      return [];
    }

    const formattedSheets: SpreadsheetFile[] = [];

    for (const item of data) {
      if (item && typeof item === "object" && "id" in item && "name" in item) {
        const id = typeof item.id === "string" ? item.id : String(item.id || "");
        const name = typeof item.name === "string" ? item.name : String(item.name || "");

        if (id && name) {
          const file: SpreadsheetFile = {
            id,
            name,
            spreadsheetId: id,
          };

          if ("properties" in item && item.properties && typeof item.properties === "object") {
            const props = item.properties;
            if ("title" in props && props.title) {
              file.properties = {
                title: typeof props.title === "string" ? props.title : String(props.title),
              };
            }
          }

          formattedSheets.push(file);
        }
      }
    }

    return formattedSheets;
  }

  // Refresh spreadsheets list
  const refreshSpreadsheets = async (): Promise<SpreadsheetFile[]> => {
    if (!credentialId) return [];

    setIsLoading(true);
    try {
      const result = await listSpreadsheetsQuery.refetch();
      const sheets = processSpreadsheetList(result.data);
      setSpreadsheets(sheets);
      return sheets;
    } catch (error) {
      console.error("Error refreshing spreadsheets:", error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new spreadsheet
  const createSpreadsheet = async (title: string): Promise<SpreadsheetFile | null> => {
    if (!credentialId) return null;

    setIsLoading(true);
    try {
      const response = await createSpreadsheetMutation.mutateAsync({
        credentialId,
        title,
      });

      if (!response || typeof response !== "object" || !("spreadsheetId" in response)) {
        throw new Error("Failed to create spreadsheet");
      }

      const spreadsheetId =
        typeof response.spreadsheetId === "string"
          ? response.spreadsheetId
          : String(response.spreadsheetId || "");

      if (!spreadsheetId) {
        throw new Error("Failed to get spreadsheet ID from created spreadsheet");
      }

      const newSheet: SpreadsheetFile = {
        id: spreadsheetId,
        name: title,
        spreadsheetId: spreadsheetId,
        properties: {
          title: response.properties?.title
            ? typeof response.properties.title === "string"
              ? response.properties.title
              : String(response.properties.title)
            : title,
        },
      };

      return newSheet;
    } catch (error) {
      console.error("Error creating spreadsheet:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Set up a booking sheet
  const setupBookingSheet = async (spreadsheetId: string): Promise<boolean> => {
    if (!credentialId) return false;

    setIsLoading(true);
    try {
      const result = await setupBookingSheetMutation.mutateAsync({
        credentialId,
        spreadsheetId,
      });

      return !!result;
    } catch (error) {
      console.error("Error setting up booking sheet:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    spreadsheets,
    createSpreadsheet,
    setupBookingSheet,
    refreshSpreadsheets,
  };
};
