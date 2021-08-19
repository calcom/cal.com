import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@lib/auth";
import prisma from "../../../../lib/prisma";

const scopes = ["User.Read", "Calendars.Read", "Calendars.ReadWrite", "offline_access"];

function generateAuthUrl() {
  return (
    "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?response_type=code&scope=" +
    scopes.join(" ") +
    "&client_id=" +
    process.env.MS_GRAPH_CLIENT_ID +
    "&redirect_uri=" +
    process.env.BASE_URL +
    "/api/integrations/office365calendar/callback"
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    // Check that user is authenticated
    const session = await getSession({ req: req });

    if (!session) {
      res.status(401).json({ message: "You must be logged in to do this" });
      return;
    }

    // Get user
    await prisma.user.findFirst({
      where: {
        email: session.user.email,
      },
      select: {
        id: true,
      },
    });

    res.status(200).json({ url: generateAuthUrl() });
  }
}
