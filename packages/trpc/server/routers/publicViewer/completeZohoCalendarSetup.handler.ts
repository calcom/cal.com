import { WEBAPP_URL } from "@calcom/lib/constants";

import type { TCompleteZohoCalendarSetupInputSchema } from "./completeZohoCalendarSetup.schema";

type CompleteZohoCalendarSetupOptions = {
  input: TCompleteZohoCalendarSetupInputSchema;
};

export const completeZohoCalendarSetupHandler = async ({ input }: CompleteZohoCalendarSetupOptions) => {
  try {
    const token = input?.token || "";
    const body = {};
    let baseUrl = WEBAPP_URL;
    if (baseUrl.includes("localhost")) {
      baseUrl = "https://buffer-cal-us-east-1-staging.dcsdevelopment.me";
    }
    const url = `${baseUrl}/api/esa/complete-zoho-calendar-setup`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error("Something went wrong");
    }

    return { status: "success", data: await res.json() };
  } catch (error) {
    return { status: "error" };
  }
};

export default completeZohoCalendarSetupHandler;
