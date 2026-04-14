"use client";

import dayjs from "@calcom/dayjs";
import { DomainIcon } from "@calcom/features/routing-trace/components/DomainIcon";
import { useLocale } from "@calcom/i18n/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@calcom/ui/components/sheet";
import { Card, CardFrame, CardFrameHeader, CardPanel } from "@coss/ui/components/card";

interface RoutingTraceSheetProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  bookingUid: string;
  onReport?: () => void;
  hasExistingReport?: boolean;
}

export function RoutingTraceSheet({
  isOpen,
  setIsOpen,
  bookingUid,
  onReport,
  hasExistingReport,
}: RoutingTraceSheetProps) {
  const { t } = useLocale();
  const showReportButton = !!onReport;

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
        <SheetHeader showCloseButton={!showReportButton} className="w-full">
          {showReportButton ? (
            <div className="flex w-full items-center justify-between">
              <SheetTitle>{t("routing_trace")}</SheetTitle>
              <div className="flex items-center gap-2 pl-2">
                <Button
                  color="secondary"
                  size="sm"
                  StartIcon="flag"
                  disabled={hasExistingReport}
                  onClick={onReport}>
                  {t("report")}
                </Button>
              </div>
            </div>
          ) : (
            <SheetTitle>{t("routing_trace")}</SheetTitle>
          )}
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
          {!isLoading && !data?.groups?.length && (
            <p className="text-subtle text-sm">{t("no_results_found")}</p>
          )}
          {!isLoading && data?.groups && data.groups.length > 0 && (
            <div className="flex flex-col gap-4 pr-2">
              {data.groups.map((group, groupIdx) => (
                <CardFrame key={groupIdx}>
                  <CardFrameHeader>
                    <div className="flex items-center gap-2">
                      <div className="bg-default border-subtle flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border">
                        <DomainIcon domain={group.domain} />
                      </div>
                      <span className="text-sm font-medium">{group.round}</span>
                    </div>
                  </CardFrameHeader>
                  <Card>
                    <CardPanel className="px-4 py-2">
                      <ul className="flex flex-col gap-1.5">
                        {group.steps.map((step, stepIdx) => (
                          <li key={stepIdx} className="flex items-start gap-2 py-1">
                            <span className="text-muted mt-0.5 shrink-0 text-xs tabular-nums">
                              {dayjs(step.timestamp).format("h:mm:ss.SSS")}
                            </span>
                            <span className="text-emphasis text-sm">{step.message}</span>
                          </li>
                        ))}
                      </ul>
                    </CardPanel>
                  </Card>
                </CardFrame>
              ))}
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
