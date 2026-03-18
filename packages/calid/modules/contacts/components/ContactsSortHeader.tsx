import { cn } from "@calid/features/lib/cn";
import { ArrowUpDown } from "lucide-react";

import type { ContactSortDirection, ContactSortKey } from "../types";

interface ContactsSortHeaderProps {
  label: string;
  field: ContactSortKey;
  activeSortKey: ContactSortKey;
  sortDirection: ContactSortDirection;
  onSortChange: (key: ContactSortKey) => void;
}

export const ContactsSortHeader = ({
  label,
  field,
  activeSortKey,
  sortDirection,
  onSortChange,
}: ContactsSortHeaderProps) => {
  return (
    <button
      type="button"
      onClick={() => onSortChange(field)}
      className="hover:text-foreground flex items-center gap-1 transition-colors">
      {label}
      <ArrowUpDown
        className={cn(
          "h-3 w-3",
          activeSortKey === field ? "text-primary" : "text-muted-foreground/50",
          activeSortKey === field && sortDirection === "desc" && "rotate-180"
        )}
      />
    </button>
  );
};
