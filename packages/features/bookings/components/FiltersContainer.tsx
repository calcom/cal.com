import { useAutoAnimate } from "@formkit/auto-animate/react";

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
              color="secondary"
              type="button"
              onClick={() => {
                removeAllQueryParams();
              }}>
              {t("remove_filters")}
            </Button>
          </Tooltip>
        </div>
      ) : null}
    </div>
  );
}
