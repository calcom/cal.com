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

interface RoutingFunnelContentProps {
  data: RoutingFunnelData[];
  enabledLegend?: Array<{ label: string; color: string }>;
}

const COLOR = {
  TOTAL: "#9AA2F7",
  SUCCESFUL: "#89CFB5",
  ACCEPTED: "#F7A1A1",
};

export const legend = [
  { label: "Total Submissions", color: COLOR.TOTAL },
  { label: "Successful Routings", color: COLOR.SUCCESFUL },
  { label: "Accepted Bookings", color: COLOR.ACCEPTED },
];

export function RoutingFunnelContent({ data, enabledLegend }: RoutingFunnelContentProps) {
  const { t } = useLocale();
  const activeAreas = enabledLegend || legend;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 30, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" className="text-xs" axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} className="text-xs opacity-50" axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        {activeAreas.some((area) => area.label === "Total Submissions") && (
          <Area
            type="linear"
            name={t("routing_funnel_total_submissions")}
            dataKey="totalSubmissions"
            stroke={COLOR.TOTAL}
            fill={COLOR.TOTAL}
            fillOpacity={1}
          />
        )}
        {activeAreas.some((area) => area.label === "Successful Routings") && (
          <Area
            type="linear"
            name={t("routing_funnel_successful_routings")}
            dataKey="successfulRoutings"
            stroke={COLOR.SUCCESFUL}
            fill={COLOR.SUCCESFUL}
            fillOpacity={1}
          />
        )}
        {activeAreas.some((area) => area.label === "Accepted Bookings") && (
          <Area
            type="linear"
            name={t("routing_funnel_accepted_bookings")}
            dataKey="acceptedBookings"
            stroke={COLOR.ACCEPTED}
            fill={COLOR.ACCEPTED}
            fillOpacity={1}
          />
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

  const totalSubmissions = payload.find((p) => p.dataKey === "totalSubmissions")?.value || 0;

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
