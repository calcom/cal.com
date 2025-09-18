import { Controller } from "react-hook-form";
import type { Control } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Label, Select } from "@calcom/ui/components/form";

import type { AgentFormValues } from "../../types/schemas";
import { LANGUAGE_OPTIONS } from "../../utils/constants";

interface LanguageSelectorProps {
  control: Control<AgentFormValues>;
  name: keyof AgentFormValues;
  disabled?: boolean;
}

export function LanguageSelector({ control, name, disabled = false }: LanguageSelectorProps) {
  const { t } = useLocale();

  return (
    <div>
      <Label className="text-emphasis mb-1 block text-sm font-medium">{t("language")}</Label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Select
            value={LANGUAGE_OPTIONS.find((option) => option.value === field.value)}
            onChange={(option) => field.onChange(option?.value)}
            options={LANGUAGE_OPTIONS}
            isDisabled={disabled}
            className="mb-4"
          />
        )}
      />
    </div>
  );
}
