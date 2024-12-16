import { memo } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc";
import { trpc } from "@calcom/trpc";
import { Icon, FilterSelect } from "@calcom/ui";

import { useFilterContext } from "../context/provider";

type Form = RouterOutputs["viewer"]["insights"]["getRoutingFormsForFilters"][number];

function buildFilterOptions(forms: Form[]) {
  return forms.map((form) => ({
    value: form.id,
    label: form.name,
  }));
}

export const RoutingFormFilterList = memo(() => {
  const { t } = useLocale();
  const { filter, setConfigFilters } = useFilterContext();
  const { selectedTeamId, selectedUserId, selectedRoutingFormId, isAll } = filter;
  const { selectedFilter } = filter;

  const { data: allForms } = trpc.viewer.insights.getRoutingFormsForFilters.useQuery(
    {
      userId: selectedUserId ?? undefined,
      teamId: selectedTeamId ?? undefined,
      isAll: isAll ?? false,
    },
    {
      enabled: selectedFilter?.includes("routing_forms"),
    }
  );

  if (!selectedFilter?.includes("routing_forms")) return null;

  const filterOptions = buildFilterOptions(allForms || []);

  return (
    <FilterSelect
      title={t("routing_forms")}
      options={filterOptions}
      selectedValue={selectedRoutingFormId}
      onChange={(value) => setConfigFilters({ selectedRoutingFormId: value as string })}
      buttonIcon={<Icon name="filter" className="mr-2 h-4 w-4" />}
    />
  );
});

RoutingFormFilterList.displayName = "RoutingFormFilterList";
