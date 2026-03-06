import logger from "@calcom/lib/logger";
import type { SWHMap } from "./__handler";

const log = logger.getSubLogger({ prefix: ["checkout.session.completed.team-creation"] });

const handler = async (data: SWHMap["checkout.session.completed"]["data"]) => {
  const session = data.object;
  log.info("Team creation checkout session completed - handled via redirect flow", {
    sessionId: session.id,
    teamName: session.metadata?.teamName,
    teamSlug: session.metadata?.teamSlug,
  });
  return { success: true, message: "Team checkout handled via redirect" };
};

export default handler;
