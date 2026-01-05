"use client";

import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { showToast } from "@calcom/ui/components/toast";

import { useInsightsBookingParameters } from "@calcom/web/modules/insights/hooks/useInsightsBookingParameters";
import { ChartCard, ChartCardItem } from "../ChartCard";

export const RecentNoShowGuestsChart = () => {
  const { t } = useLocale();
  const { copyToClipboard, isCopied } = useCopy();
  const insightsBookingParams = useInsightsBookingParameters();
  const timeZone = insightsBookingParams.timeZone;

  const { data, isSuccess, isPending, isError } = trpc.viewer.insights.recentNoShowGuests.useQuery(
    insightsBookingParams,
    {
      staleTime: 180000,
      refetchOnWindowFocus: false,
      trpc: {
        context: { skipBatch: true },
      },
    }
  );

  const handleCopyEmail = (email: string) => {
    copyToClipboard(email);
    showToast(t("email_copied"), "success");
  };

  return (
    <ChartCard
      title={t("recent_no_show_guests")}
      titleTooltip={t("recent_no_show_guests_tooltip")}
      className="h-full"
      isPending={isPending}
      isError={isError}>
      {isSuccess && data ? (
        <div className="h-full">
          <div className="sm:max-h-[30.6rem] sm:overflow-y-auto">
            {data.map((item) => (
              <ChartCardItem key={item.bookingId}>
                <div className="flex w-full items-center justify-between">
                  <div className="flex gap-2">
                    <div className="bg-subtle h-16 w-[2px] shrink-0 rounded-sm" />
                    <div className="flex flex-col stack-y-1">
                      <p className="text-sm font-medium">{item.guestName}</p>
                      <div className="text-subtle text-sm leading-tight">
                        <p>{item.eventTypeName}</p>
                        <p>
                          {Intl.DateTimeFormat(undefined, {
                            timeZone,
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(item.startTime))}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    color="minimal"
                    size="sm"
                    StartIcon={isCopied ? "clipboard-check" : "clipboard"}
                    onClick={() => handleCopyEmail(item.guestEmail)}>
                    {!isCopied ? t("email") : t("copied")}
                  </Button>
                </div>
              </ChartCardItem>
            ))}
          </div>
          {data.length === 0 && (
            <div className="flex h-60 text-center">
              <p className="m-auto text-sm font-light">{t("insights_no_data_found_for_filter")}</p>
            </div>
          )}
        </div>
      ) : null}
    </ChartCard>
  );
};
