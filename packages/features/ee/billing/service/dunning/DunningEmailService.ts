import logger from "@calcom/lib/logger";
import type { PrismaClient } from "@calcom/prisma";
import { getUserAndTeamWithBillingPermission } from "../../helpers/getUserAndTeamWithBillingPermission";
import type { DunningServiceFactory } from "./DunningServiceFactory";
import type { DunningState } from "./DunningState";

const log = logger.getSubLogger({ prefix: ["DunningEmailService"] });

export interface IDunningEmailServiceDeps {
  dunningServiceFactory: DunningServiceFactory;
  prismaClient: PrismaClient;
}

export class DunningEmailService {
  constructor(private deps: IDunningEmailServiceDeps) {}

  private async findDunningRecord(teamId: number): Promise<DunningState | null> {
    const resolved = await this.deps.dunningServiceFactory.forTeam(teamId);
    if (!resolved) return null;
    return resolved.service.findRecord(resolved.billingId);
  }

  async sendWarningEmail(teamId: number): Promise<void> {
    log.debug(`Processing warning email for team ${teamId}`);

    const record = await this.findDunningRecord(teamId);
    if (!record) {
      log.warn(`No dunning record for team ${teamId}, skipping warning email`);
      return;
    }

    const { team } = await getUserAndTeamWithBillingPermission({
      teamId,
      prismaClient: this.deps.prismaClient,
    });

    if (!team || team.adminAndOwners.length === 0) {
      log.warn(`No team or billing admins for team ${teamId}, skipping warning email`);
      return;
    }

    const { sendDunningWarningEmails } = await import("@calcom/emails/billing-email-service");
    await sendDunningWarningEmails({
      team: { id: team.id, name: team.name },
      invoiceUrl: record.invoiceUrl,
      adminAndOwners: team.adminAndOwners,
    });

    log.debug(`Sent dunning warning emails for team ${teamId}`);
  }

  async sendSoftBlockEmail(teamId: number): Promise<void> {
    log.debug(`Processing soft block email for team ${teamId}`);

    const record = await this.findDunningRecord(teamId);
    if (!record) {
      log.warn(`No dunning record for team ${teamId}, skipping soft block email`);
      return;
    }

    const { team } = await getUserAndTeamWithBillingPermission({
      teamId,
      prismaClient: this.deps.prismaClient,
    });

    if (!team || team.adminAndOwners.length === 0) {
      log.warn(`No team or billing admins for team ${teamId}, skipping soft block email`);
      return;
    }

    const { sendDunningSoftBlockEmails } = await import("@calcom/emails/billing-email-service");
    await sendDunningSoftBlockEmails({
      team: { id: team.id, name: team.name },
      invoiceUrl: record.invoiceUrl,
      adminAndOwners: team.adminAndOwners,
    });

    log.debug(`Sent dunning soft block emails for team ${teamId}`);
  }

  async sendPauseEmail(teamId: number): Promise<void> {
    log.debug(`Processing pause email for team ${teamId}`);

    const record = await this.findDunningRecord(teamId);
    if (!record) {
      log.warn(`No dunning record for team ${teamId}, skipping pause email`);
      return;
    }

    const { team } = await getUserAndTeamWithBillingPermission({
      teamId,
      prismaClient: this.deps.prismaClient,
    });

    if (!team || team.adminAndOwners.length === 0) {
      log.warn(`No team or billing admins for team ${teamId}, skipping pause email`);
      return;
    }

    const { sendDunningPauseEmails } = await import("@calcom/emails/billing-email-service");
    await sendDunningPauseEmails({
      team: { id: team.id, name: team.name },
      invoiceUrl: record.invoiceUrl,
      adminAndOwners: team.adminAndOwners,
    });

    log.debug(`Sent dunning pause emails for team ${teamId}`);
  }

  async sendCancellationEmail(teamId: number): Promise<void> {
    log.debug(`Processing cancellation email for team ${teamId}`);

    const record = await this.findDunningRecord(teamId);
    if (!record) {
      log.warn(`No dunning record for team ${teamId}, skipping cancellation email`);
      return;
    }

    const { team } = await getUserAndTeamWithBillingPermission({
      teamId,
      prismaClient: this.deps.prismaClient,
    });

    if (!team || team.adminAndOwners.length === 0) {
      log.warn(`No team or billing admins for team ${teamId}, skipping cancellation email`);
      return;
    }

    const { sendDunningCancellationEmails } = await import("@calcom/emails/billing-email-service");
    await sendDunningCancellationEmails({
      team: { id: team.id, name: team.name },
      invoiceUrl: record.invoiceUrl,
      adminAndOwners: team.adminAndOwners,
    });

    log.debug(`Sent dunning cancellation emails for team ${teamId}`);
  }
}
