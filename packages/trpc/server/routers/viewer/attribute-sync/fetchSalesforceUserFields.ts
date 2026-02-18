import logger from "@calcom/lib/logger";
import { TRPCError } from "@trpc/server";

const log = logger.getSubLogger({ prefix: ["[fetchSalesforceUserFields]"] });

export async function fetchSalesforceUserFields({
  accessToken,
  instanceUrl,
  fieldNames,
}: {
  accessToken: string;
  instanceUrl: string;
  fieldNames: string[];
}): Promise<Record<string, Record<string, string>>> {
  const uniqueFields = Array.from(new Set(["Email", ...fieldNames]));
  const soql = `SELECT ${uniqueFields.join(",")} FROM User WHERE IsActive = true`;
  const url = `${instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(soql)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    log.error("Salesforce query failed", { status: response.status, errorText });
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        response.status === 401
          ? "Salesforce authentication expired. Please reconnect your Salesforce credential."
          : `Failed to query Salesforce: ${response.statusText}`,
    });
  }

  const data = (await response.json()) as {
    records: Array<Record<string, unknown>>;
  };

  const result: Record<string, Record<string, string>> = {};

  for (const record of data.records) {
    const email = record.Email;
    if (typeof email !== "string") continue;

    const fields: Record<string, string> = {};
    for (const fieldName of fieldNames) {
      const val = record[fieldName];
      if (val !== undefined && val !== null) {
        fields[fieldName] = String(val);
      }
    }
    result[email.toLowerCase()] = fields;
  }

  return result;
}
