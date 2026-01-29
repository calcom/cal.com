"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from "@calcom/ui/components/sheet";
import { Icon } from "@calcom/ui/components/icon";

interface RoutingTraceSheetProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  bookingUid: string;
}

export function RoutingTraceSheet({ isOpen, setIsOpen, bookingUid }: RoutingTraceSheetProps) {
  const { t } = useLocale();

  const { data, isLoading } = trpc.viewer.bookings.getRoutingTrace.useQuery(
    { bookingUid },
    {
      enabled: isOpen,
      staleTime: 10 * 60 * 1000,
    }
  );

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t("routing_trace")}</SheetTitle>
        </SheetHeader>
        <SheetBody>
          {isLoading && <p className="text-subtle text-sm">{t("loading")}</p>}
          {!isLoading && (!data?.steps?.length) && (
            <p className="text-subtle text-sm">{t("no_results_found")}</p>
          )}
          {!isLoading && data?.steps && data.steps.length > 0 && (
            <div className="flex flex-col gap-3">
              {data.steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="text-subtle mt-0.5 flex-shrink-0">
                    <Icon
                      name={step.domain === "salesforce" ? "cloud" : "route"}
                      className="h-4 w-4"
                    />
                  </div>
                  <div className="text-emphasis text-sm">{step.message}</div>
                </div>
              ))}
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
