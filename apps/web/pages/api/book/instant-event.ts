import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import handleInstantMeeting from "@calcom/features/instant-meeting/handleInstantMeeting";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import { piiHasher } from "@calcom/lib/server/PiiHasher";
import { CreationSource } from "@calcom/prisma/enums";
import type { NextApiRequest } from "next";

async function handler(req: NextApiRequest & { userId?: number }) {
  const userIp = getIP(req);

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: `instant.event-${piiHasher.hash(userIp)}`,
  });

  const session = await getServerSession({ req });
  req.userId = session?.user?.id || -1;
  req.body.creationSource = CreationSource.WEBAPP;
  const booking = await handleInstantMeeting(req);
  return booking;
}
export default defaultResponder(handler);
