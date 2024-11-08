import { memo } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc";
import { trpc } from "@calcom/trpc";
import { Icon } from "@calcom/ui";
import { FilterSelect } from "@calcom/ui/filter-select";

import { useFilterContext } from "../context/provider";

type Form = RouterOutputs["viewer"]["appRoutingForms"]["forms"][number];

function buildFilterOptions(forms: Form[]) {
  return forms.map((form) => ({
    value: form.id,
    label: form.name,
  }));
}

export const RoutingFormFilterList = memo(() => {
  const { t } = useLocale();
  const { filter, setConfigFilters } = useFilterContext();
  const { selectedTeamId, selectedRoutingFormId, isAll } = filter;
  const { selectedFilter } = filter;

  const { data: allForms } = trpc.viewer.insights.getRoutingFormsForFilters.useQuery({
    teamId: selectedTeamId,
    isAll,
  });

  if (!selectedFilter?.includes("routing_forms")) return null;

  const filterOptions = buildFilterOptions(allForms || []);

  return (
    <FilterSelect
      title={t("routing_form")}
      options={filterOptions}
      selectedValue={selectedRoutingFormId}
      onChange={(value) => setConfigFilters({ selectedRoutingFormId: value })}
      buttonIcon={<Icon name="filter" className="mr-2 h-4 w-4" />}
    />
  );
});

RoutingFormFilterList.displayName = "RoutingFormFilterList";
