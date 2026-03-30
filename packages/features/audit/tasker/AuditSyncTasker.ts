import { nanoid } from "nanoid";
import type { IAuditTasker } from "../types/auditTasker";
import type { AuditTaskConsumer } from "./AuditTaskConsumer";

export interface IAuditSyncTaskerDeps {
  auditTaskConsumer: AuditTaskConsumer;
}

export class AuditSyncTasker implements IAuditTasker {
  constructor(public readonly dependencies: IAuditSyncTaskerDeps) {}

  async processEvent(payload: Parameters<IAuditTasker["processEvent"]>[0]): Promise<{ runId: string }> {
    const runId = `sync_${nanoid(10)}`;
    await this.dependencies.auditTaskConsumer.processEvent(payload);
    return { runId };
  }
}
