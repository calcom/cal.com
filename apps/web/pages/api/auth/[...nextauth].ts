import type { NextApiRequest, NextApiResponse } from "next";
import NextAuth from "next-auth";

import { getOptions } from "@calcom/features/auth/lib/next-auth-options";

//import GoogleCalendarService from "@calcom/app-store/googlecalendar/lib/CalendarService";

// pass req to NextAuth: https://github.com/nextauthjs/next-auth/discussions/469
const handler = async (req: NextApiRequest, res: NextApiResponse) =>
  NextAuth(req, res, await getOptions({ getDubId: () => req.cookies.dub_id || req.cookies.dclid }));

export default handler;

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   const blah = GoogleCalendarService;

//   res.status(200).json({ message: "Authed" });
// }
