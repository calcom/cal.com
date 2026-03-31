"use client";

import { useState } from "react";

import {
  FAILED_STATUSES,
  STATUS_VARIANTS,
  shortTaskName,
  formatDuration,
  formatCost,
  formatRunDate,
} from "@calcom/features/admin-dataview/lib/trigger-run-utils";
import { Badge } from "@calcom/ui/components/badge";
import { trpc } from "@calcom/trpc/react";
import { ExternalLinkIcon, RotateCcwIcon } from "@coss/ui/icons";
import { showToast } from "@calcom/ui/components/toast";

interface TriggerRun {
  id: string;
  taskIdentifier: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number;
  costInCents: number;
  baseCostInCents: number;
  tags: string[];
  isTest: boolean;
  env: { id: string; name: string };
}

interface TriggerRunsData {
  runs: TriggerRun[];
}


const TRIGGER_DASHBOARD_BASE = "https://cloud.trigger.dev";

function ReplayButton({ runId }: { runId: string }) {
  const [replaying, setReplaying] = useState(false);
  const replayMutation = trpc.viewer.admin.dataview.replayTriggerRun.useMutation({
    onSuccess: (data) => {
      showToast(`Replayed → new run ${data.newRunId}`, "success");
      setReplaying(false);
    },
    onError: (err) => {
      showToast(`Replay failed: ${err.message}`, "error");
      setReplaying(false);
    },
  });

  return (
    <button
      type="button"
      disabled={replaying}
      onClick={() => {
        setReplaying(true);
        replayMutation.mutate({ runId });
      }}
      className="inline-flex items-center gap-0.5 text-orange-600 hover:text-orange-700 disabled:opacity-50 dark:text-orange-400"
      title="Replay this run">
      <RotateCcwIcon className={`h-2.5 w-2.5 ${replaying ? "animate-spin" : ""}`} />
    </button>
  );
}

export function TriggerRunsPanel({ data }: { data: TriggerRunsData }) {
  if (!data.runs.length) {
    return (
      <div className="text-muted py-4 text-center text-xs italic">
        No Trigger.dev runs found for this booking
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-subtle">
      <div className="flex items-center gap-2 px-3 py-2 text-xs">
        <span className="font-medium">Runs</span>
        <Badge variant="gray" size="sm">
          {data.runs.length}
        </Badge>
      </div>
      <div className="no-scrollbar max-h-64 overflow-auto border-t border-subtle">
        <table className="min-w-full text-[11px]">
          <thead>
            <tr className="bg-subtle/50">
              <th className="text-subtle px-2 py-1 text-left font-medium">Tags</th>
              <th className="text-subtle px-2 py-1 text-left font-medium">Task</th>
              <th className="text-subtle px-2 py-1 text-left font-medium">Status</th>
              <th className="text-subtle px-2 py-1 text-left font-medium">Duration</th>
              <th className="text-subtle px-2 py-1 text-left font-medium">Cost</th>
              <th className="text-subtle px-2 py-1 text-left font-medium">Started</th>
              <th className="text-subtle px-2 py-1 text-left font-medium">Env</th>
              <th className="text-subtle px-2 py-1 text-left font-medium" />
            </tr>
          </thead>
          <tbody>
            {data.runs.map((run) => (
              <tr key={run.id} className="border-t border-subtle">
                <td className="px-2 py-1">
                  <div className="flex flex-wrap gap-0.5">
                    {run.tags.map((tag) => (
                      <Badge key={tag} variant="gray" size="sm">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="px-2 py-1 font-mono" title={run.taskIdentifier}>
                  {shortTaskName(run.taskIdentifier)}
                </td>
                <td className="px-2 py-1">
                  <Badge variant={STATUS_VARIANTS[run.status] ?? "gray"} size="sm">
                    {run.status}
                  </Badge>
                </td>
                <td className="px-2 py-1">{formatDuration(run.durationMs)}</td>
                <td className="px-2 py-1">{formatCost(run.costInCents)}</td>
                <td className="px-2 py-1">{formatRunDate(run.startedAt ?? run.createdAt)}</td>
                <td className="px-2 py-1">
                  <Badge variant="gray" size="sm">
                    {run.env.name}
                  </Badge>
                </td>
                <td className="px-2 py-1">
                  <div className="flex items-center gap-1.5">
                    {FAILED_STATUSES.has(run.status) && <ReplayButton runId={run.id} />}
                    <a
                      href={`${TRIGGER_DASHBOARD_BASE}/runs/${run.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-blue-600 hover:underline dark:text-blue-400"
                      title="View in Trigger.dev">
                      <ExternalLinkIcon className="h-2.5 w-2.5" />
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
