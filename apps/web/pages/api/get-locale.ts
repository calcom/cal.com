import type { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getLocaleFromHeaders } from "@calcom/lib/i18n";
import { defaultHandler } from "@calcom/lib/server";
import { getUserFromSession } from "@calcom/trpc/server/trpc";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession({ req, res });

  const user = await getUserFromSession({ session });

  const reqLocale = getLocaleFromHeaders(req);

  const locale = user?.locale && user?.locale !== reqLocale ? user.locale : reqLocale;

  return res.status(200).json({ locale });
}

export default defaultHandler({
  GET: Promise.resolve({ default: handler }),
});
