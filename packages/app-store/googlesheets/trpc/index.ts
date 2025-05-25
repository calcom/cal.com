import { z } from "zod";

import prisma from "@calcom/prisma";
import { createTRPCRouter, authedProcedure } from "@calcom/trpc/server/createRouter";

import { TRPCError } from "@trpc/server";

import type { GoogleSheetsCredential } from "../lib/SheetsService";
import GoogleSheetsService from "../lib/SheetsService";

export const googleSheetsRouter = createTRPCRouter({
  listSpreadsheets: authedProcedure
    .input(
      z.object({
        credentialId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
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
        const sheetsService = new GoogleSheetsService(credential as unknown as GoogleSheetsCredential);
        const spreadsheets = await sheetsService.listSpreadsheets();
        return spreadsheets;
      } catch (error) {
        console.error("Error listing spreadsheets:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to list spreadsheets",
        });
      }
    }),

  createSpreadsheet: authedProcedure
    .input(
      z.object({
        credentialId: z.number(),
        title: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
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
        const sheetsService = new GoogleSheetsService(credential as unknown as GoogleSheetsCredential);
        const spreadsheet = await sheetsService.createSpreadsheet(title);
        return spreadsheet;
      } catch (error) {
        console.error("Error creating spreadsheet:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create spreadsheet",
        });
      }
    }),

  setupBookingSheet: authedProcedure
    .input(
      z.object({
        credentialId: z.number(),
        spreadsheetId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
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
        const sheetsService = new GoogleSheetsService(credential as unknown as GoogleSheetsCredential);
        const result = await sheetsService.setupBookingSheet(spreadsheetId);
        return result;
      } catch (error) {
        console.error("Error setting up booking sheet:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to set up booking sheet",
        });
      }
    }),
});
