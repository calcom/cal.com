"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Rectangle,
} from "recharts";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { ToggleGroup } from "@calcom/ui/components/form";

import { useInsightsRoutingParameters } from "@calcom/web/modules/insights/hooks/useInsightsRoutingParameters";
import { ChartCard } from "../ChartCard";

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
    payload: { name: string; value: number };
  }>;
  label?: string;
}) => {
  const { t } = useLocale();
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="bg-default border-subtle rounded-lg border p-3 shadow-lg">
      <p className="text-default font-medium">{label}</p>
      {payload.map((entry, index: number) => (
        <p key={index}>
          {t("failed_bookings")}: {entry.value}
        </p>
      ))}
    </div>
  );
};

interface FormCardProps {
  formName: string;
  fields: Record<string, { optionId: string; count: number; optionLabel: string }[]>;
}

function FormCard({ fields }: FormCardProps) {
  const { t } = useLocale();
  const fieldNames = Object.keys(fields);
  const [selectedField, setSelectedField] = useState(fieldNames[0]);

  const toggleOptions = fieldNames.map((fieldName) => ({
    value: fieldName,
    label: fieldName.charAt(0).toUpperCase() + fieldName.slice(1),
  }));

  const selectedFieldData = fields[selectedField]?.map((option) => ({
    name: option.optionLabel,
    value: option.count,
  }));

  const maxCount = Math.max(...(selectedFieldData?.map((item) => item.value) || [0]));
  const isEmpty = maxCount === 0;

  if (isEmpty) {
    return (
      <div className="text-default flex h-60 text-center">
        <p className="m-auto text-sm font-light">{t("insights_no_data_found_for_filter")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="p-4">
        <ToggleGroup
          options={toggleOptions}
          value={selectedField}
          className="w-fit"
          onValueChange={(value) => value && setSelectedField(value)}
        />
        {selectedFieldData && selectedFieldData.length > 0 ? (
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={selectedFieldData}
                layout="vertical"
                margin={{
                  top: 20,
                  right: 10,
                  left: 20,
                  bottom: 5,
                }}
                barCategoryGap="10%">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" className="text-xs" axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" className="text-xs" axisLine={false} tickLine={false} />
                <Tooltip cursor={false} content={<CustomTooltip />} />
                <Bar
                  dataKey="value"
                  fill="var(--cal-bg-subtle)"
                  radius={[0, 2, 2, 0]}
                  activeBar={<Rectangle fill="var(--cal-bg-info)" />}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-4 p-4 text-center text-gray-500">
            No data available for selected field
            <div className="mt-2 text-xs">Data: {JSON.stringify(selectedFieldData, null, 2)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export function FailedBookingsByField() {
  const { t } = useLocale();
  const insightsRoutingParams = useInsightsRoutingParameters();
  const { data, isLoading, isError } =
    trpc.viewer.insights.failedBookingsByField.useQuery(insightsRoutingParams);

  if (!isLoading && !isError && (!data || Object.entries(data).length === 0)) return null;

  // routingFormId is always set, meaning data has only one entry.
  const [formName, fields] = data ? Object.entries(data)[0] : ["", {}];

  return (
    <ChartCard title={t("failed_bookings_by_field")} isPending={isLoading} isError={isError}>
      {data && <FormCard key={formName} formName={formName} fields={fields} />}
    </ChartCard>
  );
}
