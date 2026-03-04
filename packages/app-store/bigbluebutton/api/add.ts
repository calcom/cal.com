import type { NextApiRequest, NextApiResponse } from "next";

import { getLocaleFromRequest } from "@calcom/lib/server/i18n";
import { telemetry } from "@calcom/lib/telemetry";
import type { TAddSchema } from "@calcom/trpc/server/routers/viewer/appKeys/add.schema";
import { appKeysSchema } from "@calcom/app-store/bigbluebutton/zod";

import { asStringOrThrow } from "../../_utils/asStringOrThrow";
import { addAppKeys } from "../../_utils/addAppKeys";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { t } = await getLocaleFromRequest(req);
  await telemetry.trackTx("api", { event: "appKeys.add" });

  const body = appKeysSchema.parse(req.body);

  await addAppKeys({
    app: "bigbluebutton",
    keys: {
      bigBlueButtonServerUrl: asStringOrThrow(body.bigBlueButtonServerUrl, t("invalid_server_url")),
      bigBlueButtonSecret: asStringOrThrow(body.bigBlueButtonSecret, t("invalid_secret")),
    },
    req,
  });

  return res.status(200).json({ message: "BigBlueButton credentials saved successfully" });
}
