import { WEBAPP_URL } from "@calcom/lib/constants";

import type { TZohoConnectionInputSchema } from "./zohoConnection.schema";

type ZohoConnectionOptions = {
  input: TZohoConnectionInputSchema;
};

export const zohoConnectionHandler = async ({ input }: ZohoConnectionOptions) => {
  const token = input?.token || "";

  let baseUrl = WEBAPP_URL;

  if (baseUrl.includes("localhost")) {
    baseUrl = "https://buffer-cal-us-east-1-staging.dcsdevelopment.me";
  }

  const url = `${baseUrl}/api/esa/get-connected-calendars`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      method: "GET",
    });

    if (res.status !== 200) {
      throw new Error("Failed to get calendars");
    }

    const calendars = await res.json();

    return calendars;
  } catch (error) {
    return { calendars: [] };
  }
};

export default zohoConnectionHandler;
