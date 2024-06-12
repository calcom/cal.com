import type { IncomingMessage, ServerResponse } from "http";
import type { NextApiRequest } from "next";

export const redirectIfPlatformUser = async (
  redirectLocation: string,
  req: IncomingMessage,
  res?: ServerResponse
) => {
  const { getServerSession } = await import("@calcom/features/auth/lib/getServerSession");
  const session = await getServerSession({ req: req as NextApiRequest, res });

  if (res && session?.isPlatformUser && !req.url?.startsWith("/settings/platform")) {
    res.writeHead(302, { Location: redirectLocation });
    res.end();
  }
};
