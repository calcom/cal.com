import { Controller } from "react-hook-form";
import type { Control } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Label, Select } from "@calcom/ui/components/form";
import type { MultiSelectCheckboxesOptionType as Option } from "@calcom/ui/components/form";

import type { AgentFormValues } from "../../types/schemas";

interface EventTypeSelectorProps {
  control: Control<AgentFormValues>;
  name: keyof AgentFormValues;
  disabled?: boolean;
  eventTypeOptions: Option[];
  callType: "incoming" | "outgoing";
}

export function EventTypeSelector({
  control,
  name,
  disabled = false,
  eventTypeOptions,
  callType,
}: EventTypeSelectorProps) {
  const { t } = useLocale();

  const subtitleKey =
    callType === "incoming" ? "select_event_type_for_inbound_calls" : "select_event_type_for_outbound_calls";

  return (
    <div>
      <Label className="text-emphasis mb-1 block text-sm font-medium">{t("event_type")}</Label>
      <p className="text-subtle mb-1.5 text-xs">{t(subtitleKey)}</p>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Select
            isSearchable={false}
            innerClassNames={{ valueContainer: "font-medium" }}
            value={eventTypeOptions.find((option) => option.value === field.value?.toString())}
            onChange={(option) => field.onChange(option?.value ? parseInt(option.value) : undefined)}
            options={eventTypeOptions}
            isDisabled={disabled}
            placeholder={t("select_event_type")}
            className="mb-4"
          />
        )}
      />
    </div>
  );
}
