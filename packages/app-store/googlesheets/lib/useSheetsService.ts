import { useEffect, useState } from "react";

import { trpc } from "@calcom/trpc/react";

export const useSheetsService = (credentials: any[]) => {
  const utils = trpc.useContext();
  const [credentialId, setCredentialId] = useState<number | null>(null);

  useEffect(() => {
    if (credentials?.length > 0) {
      setCredentialId(credentials[0].id);
    }
  }, [credentials]);

  const listSpreadsheets = async () => {
    if (!credentialId) return [];

    try {
      const response = await utils.viewer.googleSheets.listSpreadsheets.fetch({
        credentialId,
      });
      return response || [];
    } catch (error) {
      console.error("Error listing spreadsheets:", error);
      return [];
    }
  };

  const createSpreadsheet = async (title: string) => {
    if (!credentialId) throw new Error("No credentials available");

    const response = await utils.viewer.googleSheets.createSpreadsheet.mutation({
      credentialId,
      title,
    });
    return response;
  };

  const setupBookingSheet = async (spreadsheetId: string) => {
    if (!credentialId) throw new Error("No credentials available");

    const response = await utils.viewer.googleSheets.setupBookingSheet.mutation({
      credentialId,
      spreadsheetId,
    });
    return response;
  };

  return {
    listSpreadsheets,
    createSpreadsheet,
    setupBookingSheet,
  };
};
