import { HttpError } from "@calcom/lib/http-error";

export function getGoogleSheetsAppKeys() {
  const googleApiKeys = JSON.parse(process.env.GOOGLE_API_CREDENTIALS || "{}");
  const googleSheetsAppKeys = googleApiKeys.googlesheets;

  if (!googleSheetsAppKeys) {
    throw new HttpError({
      statusCode: 400,
      message: "Google Sheets credentials not found",
    });
  }

  return googleSheetsAppKeys;
}
