"use client";

import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";

interface ExperimentStatsProps {
  experimentSlug: string;
}

export function ExperimentStats({ experimentSlug }: ExperimentStatsProps) {
  const { data: stats, isLoading } = trpc.viewer.experiments.getExperimentStats.useQuery({
    experimentSlug,
  });

  if (isLoading) {
    return (
      <div class="space-y-3">
        <div class="bg-emphasis h-6 w-32 animate-pulse rounded-md" />
        <div class="bg-emphasis h-20 w-full animate-pulse rounded-md" />
      </div>
    );
  }

  if (!stats || stats.totalAssignments === 0) {
    return (
      <div class="bg-muted rounded-md border p-4">
        <p class="text-subtle text-sm">No users assigned to this experiment yet.</p>
      </div>
    );
  }

  return (
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h4 class="text-emphasis text-sm font-medium">Experiment Statistics</h4>
        <Badge variant="gray">{stats.totalAssignments} total assignments</Badge>
      </div>

      <div class="bg-muted space-y-2 rounded-md border p-3">
        {stats.variantStats.map((variant) => (
          <div key={variant.variant} class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="text-emphasis text-sm font-medium">{variant.variant}</span>
              <div class="bg-default h-2 w-48 overflow-hidden rounded-full">
                <div
                  class="bg-brand-default h-full transition-all"
                  style={{ width: `${variant.percentage}%` }}
                />
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-subtle text-xs">{variant.count} users</span>
              <Badge variant="gray" class="min-w-[60px] justify-center">
                {variant.percentage.toFixed(1)}%
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
