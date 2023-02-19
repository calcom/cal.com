import type { NextApiRequest, NextApiResponse } from "next";

import { renderEmail } from "@calcom/emails";
import { getTranslation } from "@calcom/lib/server/i18n";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (process.env.NODE_ENV !== "development") return res.write("Only for development purposes"), res.end();
  const t = await getTranslation("en", "common");
  const language = { translate: t, locale: "en" };

  const evt = {
    type: "30min",
    title: "30min between Pro Example and pro@example.com",
    description: null,
    additionalNotes: "asdasdas",
    startTime: "2022-06-03T09:00:00-06:00",
    endTime: "2022-06-03T09:30:00-06:00",
    organizer: {
      name: "Pro Example",
      email: "pro@example.com",
      timeZone: "Europe/London",
      language,
    },
    attendees: [
      {
        email: "pro@example.com",
        name: "pro@example.com",
        timeZone: "America/Chihuahua",
        language,
      },
    ],
    location: "Zoom video",
    destinationCalendar: null,
    hideCalendarNotes: false,
    uid: "xxyPr4cg2xx4XoS2KeMEQy",
    metadata: {},
    recurringEvent: null,
    appsStatus: [
      {
        appName: "Outlook Calendar",
        type: "office365_calendar",
        success: 1,
        failures: 0,
        errors: [],
        warnings: [],
      },
      {
        appName: "Google Meet",
        type: "conferencing",
        success: 0,
        failures: 1,
        errors: [],
        warnings: ["In order to use Google Meet you must set your destination calendar to a Google Calendar"],
      },
    ],
  };

  req.statusCode = 200;

  res.setHeader("Content-Type", "text/html");
  res.setHeader("Cache-Control", "no-cache, no-store, private, must-revalidate");
  res.write(
    renderEmail("OrganizerScheduledEmail", {
      calEvent: evt,
      attendee: evt.organizer,
    })
  );
  res.end();
};

export default handler;
