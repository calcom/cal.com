"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Spinner } from "@calcom/ui/components/icon";
import { useCallback, useEffect, useRef, useState } from "react";
import { InsightsChatChart } from "./InsightsChatChart";
import { getSavedCharts, removeChart, SavedCharts, saveChart } from "./SavedCharts";
import type { ChatChartResult } from "./types";

interface ChatApiResponse {
  chartType: ChatChartResult["chartType"];
  title: string;
  description: string;
  endpoint: string;
  dataKeys: string[];
  xAxisKey: string;
  colors: string[];
  data: Record<string, unknown>[];
  error?: string;
}

interface InsightsChatBoxProps {
  scope: "user" | "team" | "org";
  selectedTeamId?: number;
}

export function InsightsChatBox({ scope, selectedTeamId }: InsightsChatBoxProps) {
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatResults, setChatResults] = useState<ChatChartResult[]>([]);
  const [savedCharts, setSavedCharts] = useState<ChatChartResult[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSavedCharts(getSavedCharts());
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!query.trim() || isLoading) return;

      setIsLoading(true);
      setError(null);
      setIsExpanded(true);

      try {
        const response = await fetch("/api/insights/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: query.trim(),
            scope,
            ...(selectedTeamId && { selectedTeamId }),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }),
        });

        if (!response.ok) {
          const errData: { error?: string } = await response.json();
          throw new Error(errData.error || "Failed to process query");
        }

        const result: ChatApiResponse = await response.json();

        if (result.error) {
          throw new Error(result.error);
        }

        const chartResult: ChatChartResult = {
          id: `chart-${Date.now()}`,
          query: query.trim(),
          chartType: result.chartType,
          title: result.title,
          description: result.description,
          endpoint: result.endpoint,
          dataKeys: result.dataKeys,
          xAxisKey: result.xAxisKey,
          colors: result.colors,
          data: result.data,
        };

        setChatResults((prev) => [chartResult, ...prev]);
        setQuery("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unexpected error occurred");
      } finally {
        setIsLoading(false);
      }
    },
    [query, isLoading, scope, selectedTeamId]
  );

  const handleSaveChart = useCallback((chart: ChatChartResult) => {
    const updated = saveChart(chart);
    setSavedCharts(updated);
  }, []);

  const handleRemoveChart = useCallback((chartId: string) => {
    const updated = removeChart(chartId);
    setSavedCharts(updated);
  }, []);

  const savedChartIds = new Set(savedCharts.map((c) => c.id));

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-4xl px-4 pb-4">
      {isExpanded && (
        <div
          ref={resultsRef}
          className="bg-default border-subtle mb-2 max-h-[60vh] overflow-y-auto rounded-xl border shadow-lg">
          <div className="border-subtle bg-default sticky top-0 z-10 flex items-center justify-between border-b px-4 py-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowSaved(false)}
                className={`text-sm font-medium px-2 py-1 rounded ${!showSaved ? "bg-emphasis text-emphasis" : "text-default"}`}>
                Results ({chatResults.length})
              </button>
              <button
                type="button"
                onClick={() => setShowSaved(true)}
                className={`text-sm font-medium px-2 py-1 rounded ${showSaved ? "bg-emphasis text-emphasis" : "text-default"}`}>
                {t("saved")} ({savedCharts.length})
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="text-subtle hover:text-default text-sm">
              Minimize
            </button>
          </div>

          <div className="stack-y-3 p-4">
            {showSaved ? (
              <SavedCharts charts={savedCharts} onRemove={handleRemoveChart} />
            ) : chatResults.length === 0 ? (
              <p className="text-subtle py-8 text-center text-sm">{t("insights_chat_empty_state")}</p>
            ) : (
              chatResults.map((result) => (
                <div key={result.id} className="stack-y-1">
                  <p className="text-subtle text-xs">Query: {result.query}</p>
                  <InsightsChatChart
                    result={result}
                    onSave={handleSaveChart}
                    isSaved={savedChartIds.has(result.id)}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative">
        <div className="bg-default border-subtle flex items-center gap-2 rounded-xl border p-2 shadow-lg">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("insights_chat_placeholder")}
            className="text-default placeholder:text-muted min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none"
            disabled={isLoading}
          />
          {isLoading ? (
            <div className="flex h-9 w-9 items-center justify-center">
              <Spinner className="h-5 w-5" />
            </div>
          ) : (
            <Button type="submit" color="primary" size="sm" disabled={!query.trim()} StartIcon="send">
              Send
            </Button>
          )}
        </div>
        {error && <p className="text-error mt-1 px-3 text-xs">{error}</p>}
      </form>
    </div>
  );
}
