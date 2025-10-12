"use client";

import { format } from "date-fns";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Sheet, SheetContent, SheetHeader, SheetBody } from "@calcom/ui/components/sheet";

type BookingReport = RouterOutputs["viewer"]["organizations"]["listBookingReports"]["rows"][number];

interface BookingReportDetailsSheetProps {
  open: boolean;
  onClose: () => void;
  report: BookingReport;
  onAddToWatchlist?: () => void;
}

export function BookingReportDetailsSheet({
  open,
  onClose,
  report,
  onAddToWatchlist,
}: BookingReportDetailsSheetProps) {
  const { t } = useLocale();

  const reasonColors: Record<string, "red" | "orange" | "gray"> = {
    SPAM: "red",
    DONT_KNOW_PERSON: "orange",
    OTHER: "gray",
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent>
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-emphasis text-base font-semibold">{report.bookerEmail}</h2>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant={reasonColors[report.reason] || "gray"} className="text-xs">
                  {t(report.reason.toLowerCase())}
                </Badge>
                {report.watchlistId && (
                  <Badge variant="blue" className="text-xs">
                    {t("in_watchlist")}
                  </Badge>
                )}
                {report.cancelled && (
                  <Badge variant="green" className="text-xs">
                    {t("cancelled")}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <SheetBody className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-emphasis text-sm font-semibold">{t("booking_details")}</h3>
            <div className="space-y-3">
              <div className="flex flex-col">
                <span className="text-subtle text-xs">{t("booker_email")}</span>
                <span className="text-default text-sm">{report.bookerEmail}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-subtle text-xs">{t("booking_date")}</span>
                <span className="text-default text-sm">
                  {format(new Date(report.booking.startTime), "PPP p")}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-subtle text-xs">{t("booking_title")}</span>
                <span className="text-default text-sm">{report.booking.title || t("no_title")}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-subtle text-xs">{t("view_booking")}</span>
                <a
                  href={`/booking/${report.booking.uid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-default hover:text-brand-emphasis text-sm underline">
                  /booking/{report.booking.uid}
                </a>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-emphasis text-sm font-semibold">{t("report_details")}</h3>
            <div className="space-y-3">
              <div className="flex flex-col">
                <span className="text-subtle text-xs">{t("reported_by")}</span>
                <span className="text-default text-sm">
                  {report.reporter.name || ""} ({report.reporter.email})
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-subtle text-xs">{t("reported_at")}</span>
                <span className="text-default text-sm">{format(new Date(report.createdAt), "PPP p")}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-subtle text-xs">{t("reason")}</span>
                <span className="text-default text-sm">{t(report.reason.toLowerCase())}</span>
              </div>
              {report.description && (
                <div className="flex flex-col">
                  <span className="text-subtle text-xs">{t("description")}</span>
                  <span className="text-default text-sm">{report.description}</span>
                </div>
              )}
            </div>
          </div>

          {report.watchlistId && report.watchlist && (
            <div className="space-y-4">
              <h3 className="text-emphasis text-sm font-semibold">{t("watchlist_info")}</h3>
              <div className="space-y-3">
                <div className="flex flex-col">
                  <span className="text-subtle text-xs">{t("watchlist_type")}</span>
                  <span className="text-default text-sm">{report.watchlist.type}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-subtle text-xs">{t("watchlist_value")}</span>
                  <span className="text-default text-sm">{report.watchlist.value}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-subtle text-xs">{t("watchlist_action")}</span>
                  <span className="text-default text-sm">{report.watchlist.action}</span>
                </div>
                {report.watchlist.description && (
                  <div className="flex flex-col">
                    <span className="text-subtle text-xs">{t("watchlist_description")}</span>
                    <span className="text-default text-sm">{report.watchlist.description}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {!report.watchlistId && onAddToWatchlist && (
            <div className="pt-4">
              <Button onClick={onAddToWatchlist} color="primary" className="w-full justify-center">
                {t("add_to_watchlist")}
              </Button>
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
