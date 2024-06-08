import type { Team } from "@prisma/client";

import logger from "@calcom/lib/logger";

import type { TeamBilling } from "./team-billing";

const log = logger.getSubLogger({ prefix: ["StubTeamBilling"] });

/**
 * Stub implementation of TeamBilling that does nothing.
 * Usually used when team billing is disabled.
 */
export class StubTeamBilling implements TeamBilling {
  constructor(_team: Pick<Team, "id" | "metadata">) {
    log.info(`Skipping team billing`);
  }
  async cancel() {
    log.info(`Skipping team billing cancellation due team billing being disabled`);
  }
}
