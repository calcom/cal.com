import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { ToggleGroup } from "@calcom/ui/components/form";

import { useInsightsParameters } from "../hooks/useInsightsParameters";
import { ChartCard } from "./ChartCard";
import { BarList } from "./tremor/BarList";

interface FormCardProps {
  formName: string;
  fields: Record<string, { optionId: string; count: number; optionLabel: string }[]>;
}

function FormCard({ formName, fields }: FormCardProps) {
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

  return (
    <div className="flex flex-col">
      <div className="p-4">
        <ToggleGroup
          options={toggleOptions}
          value={selectedField}
          className="w-fit"
          onValueChange={(value) => value && setSelectedField(value)}
        />
        {selectedFieldData && (
          <div className="scrollbar-thin mt-4 h-[400px] overflow-y-auto">
            <BarList
              data={selectedFieldData}
              valueFormatter={(value: number) => value.toString()}
              className="mt-2"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function FailedBookingsByField() {
  const { t } = useLocale();
  const { userId, teamId, startDate, endDate, isAll, routingFormId } = useInsightsParameters();
  const { data } = trpc.viewer.insights.failedBookingsByField.useQuery({
    userId,
    teamId,
    isAll,
    routingFormId,
  });

  if (!data || Object.entries(data).length === 0) return null;

  // routingFormId is always set, meaning data has only one entry.
  const [formName, fields] = Object.entries(data)[0];
  return (
    <ChartCard title={t("failed_bookings_by_field")} subtitle={formName}>
      <FormCard key={formName} formName={formName} fields={fields} />
    </ChartCard>
  );
}
