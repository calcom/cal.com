import { useLocale } from "@calcom/lib/hooks/useLocale";
import { TextField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";

type AssignedSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  isSearching?: boolean;
  className?: string;
};

export function AssignedSearchInput({ value, onChange, isSearching, className }: AssignedSearchInputProps) {
  const { t } = useLocale();

  return (
    <div className={className}>
      <TextField
        type="search"
        placeholder={t("search")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        addOnLeading={
          isSearching ? (
            <Icon name="loader" className="text-subtle h-4 w-4 animate-spin" />
          ) : (
            <Icon name="search" className="text-subtle h-4 w-4" />
          )
        }
      />
    </div>
  );
}
