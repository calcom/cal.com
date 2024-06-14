import logger from "@calcom/lib/logger";

import type { TeamBilling, TeamBillingInput } from "./team-billing";

const log = logger.getSubLogger({ prefix: ["StubTeamBilling"] });

/**
 * Stub implementation of TeamBilling that does nothing.
 * Usually used when team billing is disabled.
 */
export class StubTeamBilling implements TeamBilling {
  constructor(_team: TeamBillingInput) {
    log.info(`Skipping team billing`);
  }
  async cancel() {
    log.info(`Skipping team billing cancellation due team billing being disabled`);
  }
  async downgrade() {
    log.info(`Skipping team billing downgrade due team billing being disabled`);
  }
  async updateQuantity() {
    log.info(`Skipping team billing update due team billing being disabled`);
  }
}
