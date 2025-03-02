import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useSearchParams } from "next/navigation";

import { PeopleFilter } from "@calcom/features/bookings/components/PeopleFilter";
import { useFilterQuery } from "@calcom/features/bookings/lib/useFilterQuery";
import { StartTimeFilters } from "@calcom/features/filters/components/StartTimeFilters";
import { TeamsFilter } from "@calcom/features/filters/components/TeamsFilter";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Tooltip, Button } from "@calcom/ui";

import { EventTypeFilter } from "./EventTypeFilter";

export interface FiltersContainerProps {
  isFiltersVisible: boolean;
}

export function FiltersContainer({ isFiltersVisible }: FiltersContainerProps) {
  const [animationParentRef] = useAutoAnimate<HTMLDivElement>();
  const { removeAllQueryParams } = useFilterQuery();
  const { t } = useLocale();
  const searchParams = useSearchParams();

  const validFilterKeys = ["userIds", "eventTypeIds", "upIds", "teamIds", "afterStartDate", "beforeEndDate"];
  const hasValidQueryParams = Array.from(searchParams?.keys() ?? []).some((key) =>
    validFilterKeys.includes(key)
  );

  return (
    <div ref={animationParentRef}>
      {isFiltersVisible ? (
        <div className="no-scrollbar mb-2 flex w-full space-x-2 overflow-x-scroll rtl:space-x-reverse">
          <PeopleFilter />
          <EventTypeFilter />
          <TeamsFilter />
          <StartTimeFilters />
          <Tooltip content={t("remove_filters")}>
            <Button
              data-testid="btn_bookings_list_remove_filters"
              disabled={!hasValidQueryParams}
              color="secondary"
              type="button"
              onClick={removeAllQueryParams}>
              {t("remove_filters")}
            </Button>
          </Tooltip>
        </div>
      ) : null}
    </div>
  );
}
