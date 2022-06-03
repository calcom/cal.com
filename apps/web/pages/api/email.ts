import { readFileSync } from "fs";
import { NextApiRequest, NextApiResponse } from "next";
import path from "path";

import { renderEmail } from "@calcom/emails";
import { getTranslation } from "@calcom/lib/server/i18n";

import AttendeeRequestRescheduledEmail from "@lib/emails/templates/attendee-request-reschedule-email";

const emailsDir = path.resolve(process.cwd(), "lib", "emails", "templates");
const emailFile = readFileSync(path.join(emailsDir, "confirm-email.html"), {
  encoding: "utf8",
});

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const t = await getTranslation("en", "common");

  const evt = {
    type: "30min",
    title: "30min between Pro Example and pro@example.com",
    description: null,
    additionalNotes: "asdasdas",
    customInputs: {
      "Custom input 01": "sadasdasdsadasd",
      "Custom input 02": "asdasdasd",
    },
    startTime: "2022-06-03T09:00:00-06:00",
    endTime: "2022-06-03T09:30:00-06:00",
    organizer: {
      name: "Pro Example",
      email: "pro@example.com",
      timeZone: "Europe/London",
      language: { translate: t, locale: "en" },
    },
    attendees: [
      {
        email: "pro@example.com",
        name: "pro@example.com",
        timeZone: "America/Chihuahua",
        language: { translate: t, locale: "en" },
      },
    ],
    location: "Zoom video",
    destinationCalendar: null,
    hideCalendarNotes: false,
    uid: "bwPWLpjYrx4rZf6MCZdKgE",
    metadata: {},
    cancellationReason: "It got late",
    paymentInfo: { id: "pi_12312", link: "https://cal.com", reason: "no reason" },
  };

  req.statusCode = 200;

  res.setHeader("Content-Type", "text/html");
  res.setHeader("Cache-Control", "no-cache, no-store, private, must-revalidate");
  const email = new AttendeeRequestRescheduledEmail(evt, { rescheduleLink: "string" }, {});
  // res.write(email.getHtmlBody());
  res.write(
    renderEmail("OrganizerRequestReminderEmail", {
      attendee: evt.attendees[0],
      calEvent: evt,
      recurringEvent: {},
    })
  );
  res.end();
};

export default handler;
