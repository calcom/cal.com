"use client";

import { Button } from "@calcom/ui/components/button";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChatChartResult } from "./types";

const CHART_COLORS: string[] = [
  "#a855f7",
  "#22c55e",
  "#3b82f6",
  "#ef4444",
  "#64748b",
  "#f97316",
  "#06b6d4",
  "#ec4899",
];

function RenderLineChart({ result }: { result: ChatChartResult }): React.JSX.Element {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={result.data} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={result.xAxisKey} className="text-xs" axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} className="text-xs opacity-50" axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid var(--cal-border-subtle)",
            backgroundColor: "var(--cal-bg-default)",
          }}
        />
        {result.dataKeys.map((key, i) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={result.colors[i] || CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function RenderBarChart({ result }: { result: ChatChartResult }): React.JSX.Element {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={result.data} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={result.xAxisKey} className="text-xs" axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} className="text-xs opacity-50" axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid var(--cal-border-subtle)",
            backgroundColor: "var(--cal-bg-default)",
          }}
        />
        {result.dataKeys.map((key, i) => (
          <Bar
            key={key}
            dataKey={key}
            fill={result.colors[i] || CHART_COLORS[i % CHART_COLORS.length]}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function RenderPieChart({ result }: { result: ChatChartResult }): React.JSX.Element {
  const dataKey = result.dataKeys[0] || "count";
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={result.data}
          dataKey={dataKey}
          nameKey={result.xAxisKey}
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={({ name, value }: { name: string; value: number }): string => `${name}: ${value}`}>
          {result.data.map((_entry: Record<string, unknown>, index: number) => (
            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid var(--cal-border-subtle)",
            backgroundColor: "var(--cal-bg-default)",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function RenderAreaChart({ result }: { result: ChatChartResult }): React.JSX.Element {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={result.data} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={result.xAxisKey} className="text-xs" axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} className="text-xs opacity-50" axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid var(--cal-border-subtle)",
            backgroundColor: "var(--cal-bg-default)",
          }}
        />
        {result.dataKeys.map((key, i) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            stroke={result.colors[i] || CHART_COLORS[i % CHART_COLORS.length]}
            fill={`${result.colors[i] || CHART_COLORS[i % CHART_COLORS.length]}33`}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function InsightsChatChart({
  result,
  onSave,
  isSaved,
}: {
  result: ChatChartResult;
  onSave: (result: ChatChartResult) => void;
  isSaved: boolean;
}) {
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    onSave(result);
    setTimeout(() => setSaving(false), 500);
  };

  const chartComponents = {
    line: RenderLineChart,
    bar: RenderBarChart,
    pie: RenderPieChart,
    area: RenderAreaChart,
  };

  const ChartComponent = chartComponents[result.chartType] || RenderBarChart;

  return (
    <div className="border-subtle bg-default rounded-lg border p-4">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="text-emphasis text-sm font-semibold">{result.title}</h3>
          {result.description && <p className="text-subtle text-xs">{result.description}</p>}
        </div>
        <Button
          color="secondary"
          size="sm"
          onClick={handleSave}
          disabled={isSaved || saving}
          StartIcon="download">
          {isSaved ? "Saved" : "Save"}
        </Button>
      </div>
      <ChartComponent result={result} />
    </div>
  );
}
