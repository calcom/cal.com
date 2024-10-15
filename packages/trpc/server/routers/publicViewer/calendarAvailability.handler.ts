import { WEBAPP_URL } from "@calcom/lib/constants";

import type { TCalendarAvailabilityInputSchema } from "./calendarAvailabilitySchema.schema";

type CalendarAvailabilityOptions = {
  input: TCalendarAvailabilityInputSchema;
};

export const calendarAvailabilityHandler = async ({ input }: CalendarAvailabilityOptions) => {
  const token = input?.token || "";
  const isOn = !!input?.isOn;
  const type = input?.type;
  const externalId = input?.externalId;
  const credentialId = input?.credentialId;

  try {
    const body = {
      integration: type,
      externalId: externalId,
    };

    let baseUrl = WEBAPP_URL;

    if (baseUrl.includes("localhost")) {
      baseUrl = "https://buffer-cal-us-east-1-staging.dcsdevelopment.me";
    }

    const url = `${baseUrl}/api/esa/calendar-availability`;

    const authentication = {
      Authorization: `Bearer ${token}`,
    };

    if (isOn) {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authentication,
        },
        body: JSON.stringify({ ...body, credentialId }),
      });

      if (!res.ok) {
        throw new Error("Something went wrong");
      }

      return { status: "success", data: await res.json() };
    }

    const res = await fetch(`${url}?${new URLSearchParams(body)}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...authentication,
      },
    });

    if (!res.ok) {
      throw new Error("Something went wrong");
    }
    return { status: "success", data: await res.json() };
  } catch (error) {
    return { status: "error" };
  }
};

export default calendarAvailabilityHandler;
