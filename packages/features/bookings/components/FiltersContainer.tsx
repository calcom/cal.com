import { useAutoAnimate } from "@formkit/auto-animate/react";

import { PeopleFilter } from "@calcom/features/bookings/components/PeopleFilter";
import { TeamsFilter } from "@calcom/features/filters/components/TeamsFilter";

import { EventTypeFilter } from "./EventTypeFilter";

export interface FiltersContainerProps {
  isFiltersVisible: boolean;
}

export function FiltersContainer({ isFiltersVisible }: FiltersContainerProps) {
  const [animationParentRef] = useAutoAnimate<HTMLDivElement>();

  return (
    <div ref={animationParentRef}>
      {isFiltersVisible ? (
        <div className="no-scrollbar flex w-full space-x-2 overflow-x-scroll rtl:space-x-reverse">
          <PeopleFilter />
          <EventTypeFilter />
          <TeamsFilter />
        </div>
      ) : null}
    </div>
  );
}
