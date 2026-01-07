import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { trpc } from "@calcom/trpc/react";

export function useDefaultRoutingForm({
  userId,
  teamId,
  isAll,
  routingFormId,
  onRoutingFormChange,
}: {
  userId: number | null | undefined;
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
      userId: userId ?? undefined,
      teamId: teamId ?? undefined,
      isAll,
    },
    {
      enabled: isRoutingInsights,
    }
  );

  // Get the most popular form
  const mostPopularForm = routingForms?.length
    ? [...routingForms].sort((a, b) => (b._count?.responses ?? 0) - (a._count?.responses ?? 0))[0]
    : null;

  // Effect to set default routing form only once when the page loads
  useEffect(() => {
    if (isRoutingInsights && !routingFormId && mostPopularForm && !hasSetDefault.current) {
      hasSetDefault.current = true;
      const newSearchParams = new URLSearchParams(searchParams?.toString() ?? undefined);
      newSearchParams.set("routingFormId", mostPopularForm.id);
      router.push(`${pathname}?${newSearchParams.toString()}`);
      onRoutingFormChange(mostPopularForm.id);
    }
  }, [
    isRoutingInsights,
    routingFormId,
    mostPopularForm,
    pathname,
    searchParams,
    router,
    onRoutingFormChange,
  ]);

  return { routingForms, mostPopularForm };
}
