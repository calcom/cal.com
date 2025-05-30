import { appKeysSchema } from "../zod";

export const getGoogleSheetsAppKeys = async () => {
  return appKeysSchema.parse({
    client_id: process.env.GOOGLE_SHEETS_CLIENT_ID,
    client_secret: process.env.GOOGLE_SHEETS_CLIENT_SECRET,
  });
};
