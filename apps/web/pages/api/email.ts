import type { NextApiRequest, NextApiResponse } from "next";

import { renderEmail } from "@calcom/emails";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import { getTranslation } from "@calcom/lib/server/i18n";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (IS_PRODUCTION) return res.write("Only for development purposes"), res.end();
  const t = await getTranslation("en", "common");

  res.statusCode = 200;

  res.setHeader("Content-Type", "text/html");
  res.setHeader("Cache-Control", "no-cache, no-store, private, must-revalidate");

  res.write(
    await renderEmail("MonthlyDigestEmail", {
      language: t,
      Created: 12,
      Completed: 13,
      Rescheduled: 14,
      Cancelled: 16,
      mostBookedEvents: [
        {
          eventTypeId: 3,
          eventTypeName: "Test1",
          count: 3,
        },
        {
          eventTypeId: 4,
          eventTypeName: "Test2",
          count: 5,
        },
      ],
      membersWithMostBookings: [
        {
          userId: 4,
          user: {
            id: 4,
            name: "User1 name",
            email: "email.com",
            avatar: "none",
            username: "User1",
          },
          count: 4,
        },
        {
          userId: 6,
          user: {
            id: 6,
            name: "User2 name",
            email: "email2.com",
            avatar: "none",
            username: "User2",
          },
          count: 8,
        },
      ],
      admin: { email: "admin.com", name: "admin" },
      team: { name: "Team1", id: 4 },
    })
  );
  res.end();
};

export default handler;
