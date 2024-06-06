import type { NextApiRequest } from "next";

import { getTranscriptsAccessLinkFromRecordingId } from "@calcom/core/videoClient";
import { defaultResponder } from "@calcom/lib/server";

import { getTranscriptFromRecordingId } from "~/lib/validations/shared/queryIdTransformParseInt";

export async function getHandler(req: NextApiRequest) {
  const { query } = req;
  const { id, recordingId } = getTranscriptFromRecordingId.parse(query);

  const transcriptsAccessLinks = await getTranscriptsAccessLinkFromRecordingId(recordingId);

  return transcriptsAccessLinks;
}

export default defaultResponder(getHandler);
