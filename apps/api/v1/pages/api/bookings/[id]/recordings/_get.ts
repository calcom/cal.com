import type { NextApiRequest } from "next";

import { getRecordingsOfCalVideoByRoomName } from "@calcom/core/videoClient";
import { getDownloadLinkOfCalVideoByRecordingId } from "@calcom/core/videoClient";
import { defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";
import type { PartialReference } from "@calcom/types/EventManager";

import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

export async function getHandler(req: NextApiRequest) {
  const { query } = req;
  const { id } = schemaQueryIdParseInt.parse(query);

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { references: true },
  });

  const roomName =
    booking?.references?.find((reference: PartialReference) => reference.type === "daily_video")?.meetingId ??
    undefined;

  if (!roomName)
    throw new HttpError({
      statusCode: 404,
      message: `No Cal Video reference found with booking id ${booking.id}`,
    });

  const recordings = await getRecordingsOfCalVideoByRoomName(roomName);
  const recordingWithDownloadLink = recordings.data.map((recording) => {
    return getDownloadLinkOfCalVideoByRecordingId(recording.id).then(({ download_link }) => ({
      ...recording,
      download_link,
    }));
  });
  const res = Promise.all(recordingWithDownloadLink);
  return res;
}

export default defaultResponder(getHandler);
