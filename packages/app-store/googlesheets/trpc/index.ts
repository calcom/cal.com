import { z } from "zod";

import prisma from "@calcom/prisma";
import authedProcedure from "@calcom/trpc/server/procedures/authedProcedure";
import { router } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { GoogleSheetsCredential } from "../lib/SheetsService.wrapper";
import GoogleSheetsServiceWrapper from "../lib/SheetsService.wrapper";

const ZListSpreadsheetsInputSchema = z.object({
  credentialId: z.number(),
});

const ZCreateSpreadsheetInputSchema = z.object({
  credentialId: z.number(),
  title: z.string(),
});

const ZSetupBookingSheetInputSchema = z.object({
  credentialId: z.number(),
  spreadsheetId: z.string(),
});

const listSpreadsheetsHandler = async ({
  ctx,
  input,
}: {
  ctx: any;
  input: z.infer<typeof ZListSpreadsheetsInputSchema>;
}) => {
  const { credentialId } = input;

  const credential = await prisma.credential.findFirst({
    where: {
      id: credentialId,
      userId: ctx.user.id,
    },
  });

  if (!credential) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Credential not found" });
  }

  try {
    const sheetsService = new GoogleSheetsServiceWrapper(credential as unknown as GoogleSheetsCredential);
    const spreadsheets = await sheetsService.listSpreadsheets();

    return spreadsheets.map((sheet) => ({
      id: String(sheet.id || ""),
      name: String(sheet.name || ""),
      spreadsheetId: sheet.spreadsheetId ? String(sheet.spreadsheetId) : undefined,
      properties: sheet.properties
        ? {
            title: sheet.properties.title ? String(sheet.properties.title) : undefined,
          }
        : undefined,
    }));
  } catch (error) {
    console.error("Error listing spreadsheets:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to list spreadsheets",
    });
  }
};

const createSpreadsheetHandler = async ({
  ctx,
  input,
}: {
  ctx: any;
  input: z.infer<typeof ZCreateSpreadsheetInputSchema>;
}) => {
  const { credentialId, title } = input;

  const credential = await prisma.credential.findFirst({
    where: {
      id: credentialId,
      userId: ctx.user.id,
    },
  });

  if (!credential) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Credential not found" });
  }

  try {
    const sheetsService = new GoogleSheetsServiceWrapper(credential as unknown as GoogleSheetsCredential);
    const spreadsheet = await sheetsService.createSpreadsheet(title);

    return {
      spreadsheetId: spreadsheet.spreadsheetId ? String(spreadsheet.spreadsheetId) : undefined,
      properties: spreadsheet.properties
        ? {
            title: spreadsheet.properties.title ? String(spreadsheet.properties.title) : undefined,
          }
        : undefined,
    };
  } catch (error) {
    console.error("Error creating spreadsheet:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create spreadsheet",
    });
  }
};

const setupBookingSheetHandler = async ({
  ctx,
  input,
}: {
  ctx: any;
  input: z.infer<typeof ZSetupBookingSheetInputSchema>;
}) => {
  const { credentialId, spreadsheetId } = input;

  const credential = await prisma.credential.findFirst({
    where: {
      id: credentialId,
      userId: ctx.user.id,
    },
  });

  if (!credential) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Credential not found" });
  }

  try {
    const sheetsService = new GoogleSheetsServiceWrapper(credential as unknown as GoogleSheetsCredential);
    const result = await sheetsService.setupBookingSheet(spreadsheetId);
    return !!result;
  } catch (error) {
    console.error("Error setting up booking sheet:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to set up booking sheet",
    });
  }
};

export const googleSheetsRouter = router({
  listSpreadsheets: authedProcedure.input(ZListSpreadsheetsInputSchema).query(listSpreadsheetsHandler),

  createSpreadsheet: authedProcedure.input(ZCreateSpreadsheetInputSchema).mutation(createSpreadsheetHandler),

  setupBookingSheet: authedProcedure.input(ZSetupBookingSheetInputSchema).mutation(setupBookingSheetHandler),
});

export default googleSheetsRouter;
