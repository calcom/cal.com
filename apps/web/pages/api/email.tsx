import { NextApiRequest, NextApiResponse } from "next";

import { renderEmail } from "@calcom/emails";
import { getTranslation } from "@calcom/lib/server/i18n";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const t = await getTranslation("en", "common");

  const dummyPerson = {
    email: "a@a.com",
    language: {
      locale: "en",
      translate: t,
    },
    timeZone: "America/Mazatlan",
    name: "Name",
  };

  req.statusCode = 200;

  res.setHeader("Content-Type", "text/html");
  res.setHeader("Cache-Control", "no-cache, no-store, private, must-revalidate");
  res.write(
    await renderEmail("AttendeeScheduledEmail", {
      calEvent: {
        type: "type",
        title: "Event Title",
        startTime: "now",
        organizer: dummyPerson,
        endTime: "now",
        attendees: [dummyPerson],
      },
      attendee: dummyPerson,
      recurringEvent: {},
    })
  );
  res.end();
};

export default handler;
