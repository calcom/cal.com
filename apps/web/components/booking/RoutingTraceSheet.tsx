"use client";

import dayjs from "@calcom/dayjs";
import { DomainIcon } from "@calcom/features/routing-trace/components/DomainIcon";
import { getDomainLabel } from "@calcom/features/routing-trace/presenters/getDomainLabel";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from "@calcom/ui/components/sheet";

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
          {isLoading && (
            <div className="flex flex-col gap-4 py-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="bg-muted h-8 w-8 animate-pulse rounded-full" />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <div className="bg-muted h-3 w-24 animate-pulse rounded" />
                    <div className="bg-muted h-4 w-full animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!isLoading && !data?.steps?.length && (
            <p className="text-subtle text-sm">{t("no_results_found")}</p>
          )}
          {!isLoading && data?.steps && data.steps.length > 0 && (
            <div className="relative flex flex-col">
              {data.steps.map((step, idx) => {
                const isLast = idx === data.steps.length - 1;
                return (
                  <div key={idx} className="relative flex gap-3 pb-6 last:pb-0">
                    {/* Timeline connector line */}
                    {!isLast && <div className="border-subtle absolute left-4 top-8 bottom-0 border-l" />}
                    {/* Icon circle */}
                    <div className="bg-default border-subtle relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border">
                      <DomainIcon domain={step.domain} />
                    </div>
                    {/* Content */}
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
                      <div className="flex items-center gap-2">
                        <span className="bg-subtle text-subtle rounded px-1.5 py-0.5 text-xs font-medium">
                          {getDomainLabel(step.domain)}
                        </span>
                        <span className="text-muted text-xs">
                          {dayjs(step.timestamp).format("h:mm:ss.SSS A")}
                        </span>
                      </div>
                      <p className="text-emphasis text-sm">{step.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
