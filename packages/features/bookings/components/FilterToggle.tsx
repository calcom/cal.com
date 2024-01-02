import type { Dispatch, SetStateAction } from "react";

import { useFilterQuery } from "@calcom/features/bookings/lib/useFilterQuery";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Tooltip, Badge, Button } from "@calcom/ui";
import { Filter } from "@calcom/ui/components/icon";

export interface FilterToggleProps {
  setIsFiltersVisible: Dispatch<SetStateAction<boolean>>;
}

export function FilterToggle({ setIsFiltersVisible }: FilterToggleProps) {
  const {
    data: { teamIds, userIds, eventTypeIds },
  } = useFilterQuery();
  const { t } = useLocale();

  function toggleFiltersVisibility() {
    setIsFiltersVisible((prev) => !prev);
  }

  return (
    <Button color="secondary" onClick={toggleFiltersVisibility} className="mb-4">
      <Filter className="h-4 w-4" />
      <Tooltip content={t("filters")}>
        <div className="mx-2">{t("filters")}</div>
      </Tooltip>
      {(teamIds || userIds || eventTypeIds) && (
        <Badge variant="gray" rounded>
          {(teamIds ? 1 : 0) + (userIds ? 1 : 0) + (eventTypeIds ? 1 : 0)}
        </Badge>
      )}
    </Button>
  );
}
