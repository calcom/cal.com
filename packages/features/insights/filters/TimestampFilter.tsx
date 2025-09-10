import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Select } from "@calcom/ui/components/form/select";

export type TimestampTarget = "startTime" | "createdAt";

interface TimestampOption {
  label: string;
  value: TimestampTarget;
}

interface TimestampFilterProps {
  value: TimestampTarget;
  onChange: (value: TimestampTarget) => void;
}

export const TimestampFilter = ({ value, onChange }: TimestampFilterProps) => {
  const { t } = useLocale();

  const options: TimestampOption[] = [
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
