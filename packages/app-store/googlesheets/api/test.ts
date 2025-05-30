import type { Credentials } from "google-auth-library";
import type { NextApiRequest, NextApiResponse } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import { CredentialRepository } from "@calcom/lib/server/repository/credential";

import GoogleSheetsService from "../lib/GoogleSheetsService";

async function postHandler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session?.user?.id) {
    throw new HttpError({ statusCode: 401, message: "You must be logged in to do this" });
  }

  const { spreadsheetId } = req.body;

  if (!spreadsheetId) {
    throw new HttpError({ statusCode: 400, message: "Spreadsheet ID is required" });
  }

  // Get user's Google Sheets credential
  const credential = await CredentialRepository.findFirstByUserIdAndType({
    userId: req.session.user.id,
    type: "googlesheets_other",
  });

  if (!credential?.key) {
    throw new HttpError({
      statusCode: 400,
      message: "Google Sheets integration not found. Please connect your Google account first.",
    });
  }

  try {
    const sheetsService = await new GoogleSheetsService(credential.key as Credentials).initializeClient();
    const isAccessible = await sheetsService.validateSpreadsheetAccess(spreadsheetId);

    if (!isAccessible) {
      throw new HttpError({
        statusCode: 400,
        message: "Cannot access the spreadsheet. Please check the URL and ensure you have edit permissions.",
      });
    }

    res.status(200).json({ success: true, message: "Spreadsheet is accessible" });
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError({
      statusCode: 500,
      message: "Failed to test spreadsheet connection",
    });
  }
}

export default defaultHandler({
  POST: Promise.resolve({ default: defaultResponder(postHandler) }),
});
