import { useState } from "react";

import { trpc } from "@calcom/trpc";
import { ToggleGroup } from "@calcom/ui/components/form";
import classNames from "@calcom/ui/classNames";

import { useInsightsParameters } from "../hooks/useInsightsParameters";
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
    <div className="border-subtle w-full rounded-md border">
      <div className="flex flex-col">
        <div className="bg-subtle border-subtle flex h-12 items-center border-b">
          <h3 className="text-default px-2 text-left align-middle font-medium">{formName}</h3>
        </div>
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
    </div>
  );
}

export function FailedBookingsByField() {
  const { userId, teamId, startDate, endDate, isAll, routingFormId } = useInsightsParameters();
  const { data } = trpc.viewer.insights.failedBookingsByField.useQuery({
    userId,
    teamId,
    isAll,
    routingFormId,
  });

  if (!data) return null;

  return (
    <div className="w-full text-sm">
      <div className="flex h-12 items-center">
        <h2 className="text-emphasis text-md font-semibold">Failed Bookings By Field</h2>
      </div>
      <div className="">
        <div className={classNames("grid grid-cols-1 gap-6 lg:grid-cols-2")}>
          {Object.entries(data).map(([formName, fields]) => (
            <FormCard key={formName} formName={formName} fields={fields} />
          ))}
        </div>
      </div>
    </div>
  );
}
