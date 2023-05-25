import type { NextApiRequest, NextApiResponse } from "next";
import { createCalendarEventFromBooking, getUsersDueDigests } from "pages/api/cron/dailyDigest";

import { renderEmail } from "@calcom/emails";
import { getTranslation } from "@calcom/lib/server/i18n";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (process.env.NODE_ENV !== "development") return res.write("Only for development purposes"), res.end();
  req.statusCode = 200;
  res.setHeader("Content-Type", "text/html");
  res.setHeader("Cache-Control", "no-cache, no-store, private, must-revalidate");

  const users = await getUsersDueDigests();

  for (const user of users) {
    const t = await getTranslation(user.locale ?? "en", "common");
    const calEventListPromises = user.bookings.map((booking) =>
      createCalendarEventFromBooking(user, booking, t)
    );
    const calEventList = await Promise.all(calEventListPromises);

    res.write(
      renderEmail("OrganizerDailyDigestEmail", {
        user,
        calEvents: calEventList,
        t,
      })
    );
  }
  res.end();
};

export default handler;
