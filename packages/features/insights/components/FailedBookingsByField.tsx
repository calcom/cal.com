import { BarList, Card } from "@tremor/react";
import { useState } from "react";

import { classNames } from "@calcom/lib";
import { trpc } from "@calcom/trpc";
import { ToggleGroup } from "@calcom/ui";

import { useFilterContext } from "../context/provider";

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
    <Card className="h-[400px] w-full">
      <div className="flex flex-col">
        <h3 className="text-emphasis mb-4">{formName}</h3>
        <ToggleGroup
          options={toggleOptions}
          value={selectedField}
          className="w-fit"
          onValueChange={(value) => value && setSelectedField(value)}
        />
        {selectedFieldData && (
          <div className="scrollbar-thin mt-4 h-full overflow-y-auto">
            <BarList
              data={selectedFieldData}
              valueFormatter={(value: number) => value.toString()}
              className="mt-2"
            />
          </div>
        )}
      </div>
    </Card>
  );
}

export function FailedBookingsByField() {
  const { filter } = useFilterContext();
  const { selectedTeamId, isAll, initialConfig, selectedRoutingFormId } = filter;
  const initialConfigIsReady = !!(initialConfig?.teamId || initialConfig?.userId || initialConfig?.isAll);

  const { data } = trpc.viewer.insights.failedBookingsByField.useQuery(
    {
      teamId: selectedTeamId ?? undefined,
      isAll: !!isAll,
      routingFormId: selectedRoutingFormId ?? undefined,
    },
    {
      enabled: initialConfigIsReady,
    }
  );

  if (!data) return null;

  return (
    <div className="">
      <h2 className="text-emphasis mb-4 font-bold">Failed Bookings By Field</h2>
      <div className={classNames("grid grid-cols-1 gap-6 lg:grid-cols-2")}>
        {Object.entries(data).map(([formName, fields]) => (
          <FormCard key={formName} formName={formName} fields={fields} />
        ))}
      </div>
    </div>
  );
}
