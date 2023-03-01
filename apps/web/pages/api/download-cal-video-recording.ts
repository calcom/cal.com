import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { fetcher } from "@calcom/app-store/dailyvideo/lib/VideoApiAdapter";
import { getSession } from "@calcom/lib/auth";
import { IS_SELF_HOSTED } from "@calcom/lib/constants";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";

const getAccessLinkSchema = z.object({
  download_link: z.string().url(),
  // expires (timestamp), s3_bucket, s3_region, s3_key
});

const requestQuery = z.object({
  recordingId: z.string(),
});

const isDownloadAllowed = async (req: NextApiRequest) => {
  if (IS_SELF_HOSTED) return true;
  const session = await getSession({ req });
  // Check if user belong to active team
  return !session?.user?.belongsToActiveTeam;
};

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<z.infer<typeof getAccessLinkSchema> | void>
) {
  const { recordingId } = requestQuery.parse(req.query);

  if (!(await isDownloadAllowed(req))) return res.status(403);

  const response = await fetcher(`/recordings/${recordingId}/access-link`).then(getAccessLinkSchema.parse);
  return res.status(200).json(response);
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
