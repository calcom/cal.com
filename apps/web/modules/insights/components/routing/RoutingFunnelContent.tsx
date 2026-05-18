"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface RoutingFunnelData {
  name: string;
  formattedDateFull: string;
  totalSubmissions: number;
  successfulRoutings: number;
  acceptedBookings: number;
}

export type LegendKey = "totalSubmissions" | "successfulRoutings" | "acceptedBookings";

interface RoutingFunnelContentProps {
  data: RoutingFunnelData[];
  enabledKeys?: LegendKey[];
}

const COLOR = {
  TOTAL: "#9AA2F7",
  SUCCESFUL: "#89CFB5",
  ACCEPTED: "#F7A1A1",
};

export const LEGEND_KEYS: { key: LegendKey; color: string; i18nKey: string }[] = [
  { key: "totalSubmissions", color: COLOR.TOTAL, i18nKey: "routing_funnel_total_submissions" },
  { key: "successfulRoutings", color: COLOR.SUCCESFUL, i18nKey: "routing_funnel_successful_routings" },
  { key: "acceptedBookings", color: COLOR.ACCEPTED, i18nKey: "routing_funnel_accepted_bookings" },
];

export function RoutingFunnelContent({ data, enabledKeys }: RoutingFunnelContentProps) {
  const { t } = useLocale();
  const activeKeys = new Set(enabledKeys ?? LEGEND_KEYS.map((l) => l.key));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 30, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" className="text-xs" axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} className="text-xs opacity-50" axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        {LEGEND_KEYS.map(({ key, color, i18nKey }) =>
          activeKeys.has(key) ? (
            <Area
              key={key}
              type="linear"
              name={t(i18nKey)}
              dataKey={key}
              stroke={color}
              fill={color}
              fillOpacity={1}
            />
          ) : null
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Custom Tooltip component
const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    name: string;
    color: string;
    payload: RoutingFunnelData;
  }>;
  label?: string;
}) => {
  if (!active || !payload?.length) {
    return null;
  }

  const totalSubmissions = payload[0].payload.totalSubmissions;

  return (
    <div className="bg-default text-inverted border-subtle rounded-lg border p-3 shadow-lg">
      <p className="text-default font-medium">{payload[0].payload.formattedDateFull}</p>
      {payload.map((entry, index: number) => {
        const value = entry.value;
        let displayValue = value.toString();

        if (entry.dataKey === "successfulRoutings" || entry.dataKey === "acceptedBookings") {
          const percentage = totalSubmissions > 0 ? ((value / totalSubmissions) * 100).toFixed(1) : "0";
          displayValue = `${value} (${percentage}%)`;
        }

        return (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {displayValue}
          </p>
        );
      })}
    </div>
  );
};

export const legend = LEGEND_KEYS;
