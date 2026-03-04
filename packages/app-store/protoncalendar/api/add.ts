import type { NextApiRequest, NextApiResponse } from "next";

import { getLocaleFromRequest } from "@calcom/lib/server/i18n";
import { telemetry } from "@calcom/lib/telemetry";
import type { TAddSchema } from "@calcom/trpc/server/routers/viewer/appKeys/add.schema";
import { appKeysSchema } from "@calcom/app-store/protoncalendar/zod";

import { asStringOrThrow } from "../../_utils/asStringOrThrow";
import { addAppKeys } from "../../_utils/addAppKeys";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { t } = await getLocaleFromRequest(req);
  await telemetry.trackTx("api", { event: "appKeys.add" });

  const body = appKeysSchema.parse(req.body);

  await addAppKeys({
    app: "proton-calendar",
    keys: {
      protonIcsFeedUrl: asStringOrThrow(body.protonIcsFeedUrl, t("invalid_ics_feed_url")),
    },
    req,
  });

  return res.status(200).json({ message: "Proton Calendar ICS feed URL saved successfully" });
}
