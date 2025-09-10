import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Select } from "@calcom/ui/components/form/select";

export type DateTarget = "startTime" | "createdAt";

interface DateTargetOption {
  label: string;
  value: DateTarget;
}

interface DateTargetSelectorProps {
  value: DateTarget;
  onChange: (value: DateTarget) => void;
}

export const DateTargetSelector = ({ value, onChange }: DateTargetSelectorProps) => {
  const { t } = useLocale();

  const options: DateTargetOption[] = [
    { label: t("start_time"), value: "startTime" },
    { label: t("created_at"), value: "createdAt" },
  ];

  const selectedOption = options.find((option) => option.value === value) || options[0];

  return (
    <Select
      value={selectedOption}
      onChange={(option) => {
        if (option) {
          onChange(option.value);
        }
      }}
      options={options}
      isSearchable={false}
      className="w-40"
      size="sm"
    />
  );
};
