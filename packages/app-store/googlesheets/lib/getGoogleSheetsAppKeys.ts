import { googleSheetsKeysSchema } from "../zod";

export const getGoogleSheetsAppKeys = async () => {
  return googleSheetsKeysSchema.parse({
    client_id: process.env.GOOGLE_SHEETS_CLIENT_ID,
    client_secret: process.env.GOOGLE_SHEETS_CLIENT_SECRET,
  });
};