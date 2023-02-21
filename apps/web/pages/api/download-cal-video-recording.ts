import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { fetcher } from "@calcom/app-store/dailyvideo/lib/VideoApiAdapter";
import { getSession } from "@calcom/lib/auth";
import { IS_SELF_HOSTED } from "@calcom/lib/constants";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";

const getAccessLinkSchema = z.union([
  z.object({
    download_link: z.string(),
    expires: z.number(),
  }),
  z.object({}),
]);

const requestQuery = z.object({
  recordingId: z.string(),
});

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<z.infer<typeof getAccessLinkSchema> | void>
) {
  const { recordingId } = requestQuery.parse(req.query);
  const session = await getSession({ req });

  //   Check if user belong to active team
  const isDownloadAllowed = IS_SELF_HOSTED ? true : !session?.user?.belongsToActiveTeam;
  if (!isDownloadAllowed) {
    return res.status(403);
  }
  try {
    const response = await fetcher(`/recordings/${recordingId}/access-link`).then(getAccessLinkSchema.parse);

    if ("download_link" in response && response.download_link) {
      return res.status(200).json(response);
    }

    return res.status(400);
  } catch (err) {
    res.status(500);
  }
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
