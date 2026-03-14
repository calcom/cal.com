"use client";

import { Button } from "@calcom/ui/components/button";
import { InsightsChatChart } from "./InsightsChatChart";
import type { ChatChartResult } from "./types";

const STORAGE_KEY = "cal-insights-saved-charts";

export function getSavedCharts(): ChatChartResult[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as ChatChartResult[];
  } catch {
    return [];
  }
}

export function saveChart(chart: ChatChartResult): ChatChartResult[] {
  const existing = getSavedCharts();
  const updated = [{ ...chart, savedAt: Date.now() }, ...existing];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function removeChart(chartId: string): ChatChartResult[] {
  const existing = getSavedCharts();
  const updated = existing.filter((c) => c.id !== chartId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function SavedCharts({
  charts,
  onRemove,
}: {
  charts: ChatChartResult[];
  onRemove: (chartId: string) => void;
}) {
  if (charts.length === 0) return null;

  return (
    <div className="stack-y-3">
      <h3 className="text-emphasis text-sm font-semibold">Saved Charts</h3>
      {charts.map((chart) => (
        <div key={chart.id} className="relative">
          <InsightsChatChart result={chart} onSave={() => undefined} isSaved={true} />
          <Button
            color="destructive"
            size="sm"
            className="absolute right-2 top-2"
            onClick={() => onRemove(chart.id)}
            StartIcon="trash-2">
            Remove
          </Button>
        </div>
      ))}
    </div>
  );
}
