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
}

export function EventTypeSelector({
  control,
  name,
  disabled = false,
  eventTypeOptions,
}: EventTypeSelectorProps) {
  const { t } = useLocale();

  return (
    <div>
      <Label className="text-emphasis mb-1 block text-sm font-medium">{t("event_type")}</Label>
      <p className="text-subtle mb-1.5 text-xs">{t("select_event_type_for_inbound_calls")}</p>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Select
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
