import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { trpc } from "@calcom/trpc";

export function useDefaultRoutingForm({
  teamId,
  isAll,
  routingFormId,
  onRoutingFormChange,
}: {
  teamId: number | null | undefined;
  isAll: boolean;
  routingFormId: string | null | undefined;
  onRoutingFormChange: (formId: string) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useCompatSearchParams();
  const isRoutingInsights = pathname?.includes("/insights/routing");
  const hasSetDefault = useRef(false);

  // Query to get routing forms list
  const { data: routingForms } = trpc.viewer.insights.getRoutingFormsForFilters.useQuery(
    {
      teamId: teamId ?? undefined,
      isAll,
    },
    {
      enabled: isRoutingInsights,
    }
  );

  // Effect to set default routing form only once when the page loads
  useEffect(() => {
    if (isRoutingInsights && !routingFormId && routingForms?.length && !hasSetDefault.current) {
      // Sort forms by response count and get the most popular one
      const mostPopularForm = [...routingForms].sort(
        (a, b) => (b._count?.responses ?? 0) - (a._count?.responses ?? 0)
      )[0];

      if (mostPopularForm) {
        hasSetDefault.current = true;
        const newSearchParams = new URLSearchParams(searchParams?.toString() ?? undefined);
        newSearchParams.set("routingFormId", mostPopularForm.id);
        router.push(`${pathname}?${newSearchParams.toString()}`);
        onRoutingFormChange(mostPopularForm.id);
      }
    }
  }, [isRoutingInsights, routingFormId, routingForms, pathname, searchParams, router, onRoutingFormChange]);

  return { routingForms };
}
