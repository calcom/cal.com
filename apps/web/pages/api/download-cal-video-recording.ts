import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { fetcher } from "@calcom/app-store/dailyvideo/lib/VideoApiAdapter";
import { getSession } from "@calcom/lib/auth";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";

type Response = {
  download_link?: string | undefined;
  expires?: number;
  error?: string;
};

const requestQuery = z.object({
  recordingId: z.string(),
});

async function handler(req: NextApiRequest, res: NextApiResponse<Response>) {
  const { recordingId } = requestQuery.parse(req.query);
  const session = await getSession({ req });

  //   Check if user belong to active team
  if (!session?.user?.belongsToActiveTeam) {
    return res.status(403);
  }
  try {
    const response = (await fetcher(`/recordings/${recordingId}/access-link`)) as Response;
    if (!response.download_link) return res.status(400);
    return res.status(200).json({ download_link: response.download_link, expires: response.expires });
  } catch (err) {
    res.status(500).send({ error: "Failed to get recording" });
  }
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
