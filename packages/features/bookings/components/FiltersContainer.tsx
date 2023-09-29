import { shallow } from "zustand/shallow";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Tooltip } from "@calcom/ui";
import { Filter } from "@calcom/ui/components/icon";

import { useBookingMultiFilterStore } from "../BookingMultiFiltersStore";

export function FiltersContainer() {
  const { t } = useLocale();

  const [toggleFilterViewOpen, activeFilters] = useBookingMultiFilterStore((state) => [
    state.toggleFilterViewOpen,
    state.activeFilters,
    shallow,
  ]);

  return (
    <div className="flex w-full space-x-2 rtl:space-x-reverse">
      <button
        type="button"
        onClick={toggleFilterViewOpen}
        className="hover:border-emphasis border-default text-default hover:text-emphasis mb-4 flex h-9 max-h-72 items-center justify-between whitespace-nowrap rounded-md border px-3 py-2 text-sm hover:cursor-pointer">
        <Filter className="mr-2 h-4 w-4" />
        <Tooltip content={t("add_filter")}>
          <div>{t("add_filter")}</div>
        </Tooltip>
        {activeFilters?.length > 0 && (
          <div className="bg-emphasis ml-2 flex h-5 w-5 items-center justify-center rounded-full text-xs">
            {activeFilters?.length}
          </div>
        )}
      </button>
    </div>
  );
}
