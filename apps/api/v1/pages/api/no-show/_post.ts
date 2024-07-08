import type { NextApiRequest } from "next";

import handleMarkNoShow from "@calcom/features/handleMarkNoShow";
import { defaultResponder } from "@calcom/lib/server";
import { ZNoShowInputSchema } from "@calcom/trpc/server/routers/publicViewer/noShow.schema";

async function postHandler(req: NextApiRequest) {
  const data = ZNoShowInputSchema.parse(req.body);

  const { bookingUid, attendees } = data;

  const markNoShowResponse = await handleMarkNoShow({ bookingUid, attendees });

  if (markNoShowResponse.error)
    throw new HttpError({
      statusCode: 500,
      message: markNoShowResponse.message,
    });

  return markNoShowResponse;
}

export default defaultResponder(postHandler);
