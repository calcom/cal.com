import { runs } from "@trigger.dev/sdk/v3";

export interface TriggerRunItem {
  id: string;
  taskIdentifier: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  durationMs: number;
  costInCents: number;
  baseCostInCents: number;
  tags: string[];
  isTest: boolean;
  env: { id: string; name: string };
}

export interface ListRunsByTagParams {
  tag: string;
  limit: number;
}

export interface ListRunsByTagResult {
  runs: TriggerRunItem[];
}

export interface ReplayRunResult {
  newRunId: string;
}

export class AdminTriggerRunsService {
  async listByTag(params: ListRunsByTagParams): Promise<ListRunsByTagResult> {
    const page = await runs.list({ tag: params.tag, limit: params.limit });

    return {
      runs: page.data.map((run) => ({
        id: run.id,
        taskIdentifier: run.taskIdentifier,
        status: run.status,
        createdAt: run.createdAt,
        updatedAt: run.updatedAt,
        startedAt: run.startedAt ?? null,
        finishedAt: run.finishedAt ?? null,
        durationMs: run.durationMs,
        costInCents: run.costInCents,
        baseCostInCents: run.baseCostInCents,
        tags: run.tags,
        isTest: run.isTest,
        env: run.env,
      })),
    };
  }

  async replay(runId: string): Promise<ReplayRunResult> {
    const result = await runs.replay(runId);
    return { newRunId: result.id };
  }
}
