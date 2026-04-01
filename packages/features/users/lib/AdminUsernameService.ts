import logger from "@calcom/lib/logger";
import type { PrismaClient } from "@calcom/prisma";
import { RedirectType } from "@calcom/prisma/enums";

const log = logger.getSubLogger({ prefix: ["AdminUsernameService"] });

type BlockingRecord = {
  type: "profile" | "user" | "tempOrgRedirect";
  id: number | string;
  detail: string;
};

export type ReleaseUsernamePreviewResult = {
  mode: "preview";
  username: string;
  organizationId: number | null;
  blockingRecords: BlockingRecord[];
  canRelease: boolean;
};

export type ReleaseUsernameExecuteResult = {
  mode: "execute";
  released: boolean;
  deletedRecords: BlockingRecord[];
};

export class AdminUsernameService {
  constructor(private readonly prisma: PrismaClient) {}

  async preview(username: string, organizationId: number | null): Promise<ReleaseUsernamePreviewResult> {
    const blockingRecords = await this.findBlockingRecords(username, organizationId);

    return {
      mode: "preview",
      username,
      organizationId,
      blockingRecords,
      canRelease: blockingRecords.length > 0,
    };
  }

  async execute(
    username: string,
    organizationId: number | null
  ): Promise<ReleaseUsernameExecuteResult> {
    const blockingRecords = await this.findBlockingRecords(username, organizationId);

    if (blockingRecords.length === 0) {
      return { mode: "execute", released: false, deletedRecords: [] };
    }

    const deletedRecords: BlockingRecord[] = await this.prisma.$transaction(async (tx) => {
      const deleted: BlockingRecord[] = [];

      for (const record of blockingRecords) {
        if (record.type === "profile") {
          await tx.profile.delete({ where: { id: record.id as number } });
          deleted.push(record);
        } else if (record.type === "tempOrgRedirect") {
          await tx.tempOrgRedirect.delete({ where: { id: record.id as number } });
          deleted.push(record);
        } else if (record.type === "user") {
          // Don't delete the user — just null out the username to release it
          await tx.user.update({
            where: { id: record.id as number },
            data: { username: null },
            select: { id: true },
          });
          deleted.push(record);
        }
      }

      return deleted;
    });

    log.info("Username released", {
      username,
      organizationId,
      deletedRecords: deletedRecords.map((r) => ({ type: r.type, id: r.id })),
    });

    return { mode: "execute", released: true, deletedRecords };
  }

  private async findBlockingRecords(
    username: string,
    organizationId: number | null
  ): Promise<BlockingRecord[]> {
    const records: BlockingRecord[] = [];

    // Check Profile table: username stuck in an org
    if (organizationId) {
      const profiles = await this.prisma.profile.findMany({
        where: { username, organizationId },
        select: { id: true, userId: true, organizationId: true },
      });
      for (const p of profiles) {
        records.push({
          type: "profile",
          id: p.id,
          detail: `Profile #${p.id} (userId: ${p.userId}, orgId: ${p.organizationId})`,
        });
      }
    }

    // Check User table: username held by a user (possibly in an org via organizationId)
    const users = await this.prisma.user.findMany({
      where: {
        username,
        ...(organizationId ? { organizationId } : { organizationId: null }),
      },
      select: { id: true, email: true, organizationId: true },
    });
    for (const u of users) {
      records.push({
        type: "user",
        id: u.id,
        detail: `User #${u.id} (${u.email}, orgId: ${u.organizationId ?? "none"})`,
      });
    }

    // Check TempOrgRedirect: username reserved in global namespace due to org migration
    const redirects = await this.prisma.tempOrgRedirect.findMany({
      where: {
        from: username,
        type: RedirectType.User,
        ...(organizationId ? {} : { fromOrgId: 0 }),
      },
      select: { id: true, fromOrgId: true, toUrl: true },
    });
    for (const r of redirects) {
      records.push({
        type: "tempOrgRedirect",
        id: r.id,
        detail: `TempOrgRedirect #${r.id} (fromOrgId: ${r.fromOrgId}, toUrl: ${r.toUrl})`,
      });
    }

    return records;
  }
}
