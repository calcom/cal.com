"use client";

import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Badge } from "@calcom/ui/components/badge";
// Using simple div elements instead of Card components
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@calcom/ui/components/table";
import { Alert } from "@calcom/ui/components/alert";
import { showToast } from "@calcom/ui/components/toast";
import { format } from "date-fns";

interface ReportedBookingsListProps {
    organizationId: number;
}

export function ReportedBookingsList({ organizationId }: ReportedBookingsListProps) {
    const { t } = useLocale();
    const [page, setPage] = useState(0);
    const itemsPerPage = 10;

  const {
    data: reportedBookings,
    isLoading,
    error,
    refetch,
  } = trpc.viewer.organizations.getReportedBookings.useQuery({
    organizationId,
    skip: page * itemsPerPage,
    take: itemsPerPage,
  });

  const blockEmailFromReportMutation = trpc.viewer.organizations.blockEmailFromReport.useMutation({
    onSuccess: () => {
      showToast(t("email_blocked_successfully"), "success");
      refetch();
    },
    onError: (error) => {
      showToast(error.message || t("error_blocking_email"), "error");
    },
  });

  const blockDomainFromReportMutation = trpc.viewer.organizations.blockDomainFromReport.useMutation({
    onSuccess: () => {
      showToast(t("domain_blocked_successfully"), "success");
      refetch();
    },
    onError: (error) => {
      showToast(error.message || t("error_blocking_domain"), "error");
    },
  });

  const ignoreReportMutation = trpc.viewer.organizations.ignoreReport.useMutation({
    onSuccess: () => {
      showToast(t("report_ignored_successfully"), "success");
      refetch();
    },
    onError: (error) => {
      showToast(error.message || t("error_ignoring_report"), "error");
    },
  });

    const handleBlockEmail = (bookingReportId: string) => {
        blockEmailFromReportMutation.mutate({
            bookingReportId,
            organizationId,
        });
    };

    const handleBlockDomain = (bookingReportId: string) => {
        blockDomainFromReportMutation.mutate({
            bookingReportId,
            organizationId,
        });
    };

    const handleIgnoreReport = (bookingReportId: string) => {
        ignoreReportMutation.mutate({
            bookingReportId,
            organizationId,
        });
    };

    const getReasonBadgeColor = (reason: string) => {
        switch (reason) {
            case "SPAM":
                return "destructive";
            case "DONT_KNOW_PERSON":
                return "warning";
            case "OTHER":
                return "secondary";
            default:
                return "secondary";
        }
    };

    const getStatusBadgeColor = (status: string) => {
        switch (status) {
            case "ACCEPTED":
                return "default";
            case "PENDING":
                return "warning";
            case "CANCELLED":
                return "destructive";
            case "REJECTED":
                return "destructive";
            default:
                return "secondary";
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="text-sm text-gray-500">{t("loading")}...</div>
            </div>
        );
    }

    if (error) {
        return (
            <Alert
                severity="error"
                title={t("error_loading_reported_bookings")}
                message={error.message}
            />
        );
    }

    if (!reportedBookings || reportedBookings.length === 0) {
        return (
            <div className="text-center py-8">
                <p className="text-sm text-gray-500">{t("no_reported_bookings")}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t("booking")}</TableHead>
                        <TableHead>{t("booker_email")}</TableHead>
                        <TableHead>{t("reason")}</TableHead>
                        <TableHead>{t("status")}</TableHead>
                        <TableHead>{t("reported_by")}</TableHead>
                        <TableHead>{t("reported_at")}</TableHead>
                        <TableHead>{t("actions")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {reportedBookings.map((report) => (
                        <TableRow key={report.id}>
                            <TableCell>
                                <div>
                                    <div className="font-medium">{report.booking.title}</div>
                                    <div className="text-sm text-gray-500">
                                        {format(new Date(report.booking.startTime), "PPp")} - {format(new Date(report.booking.endTime), "PPp")}
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="font-mono text-sm">{report.bookerEmail}</div>
                            </TableCell>
                            <TableCell>
                                <Badge variant={getReasonBadgeColor(report.reason)}>
                                    {t(`report_reason_${report.reason.toLowerCase()}`)}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <Badge variant={getStatusBadgeColor(report.booking.status)}>
                                    {report.booking.status}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <div>
                                    <div className="font-medium">{report.reportedBy.name || t("unknown")}</div>
                                    <div className="text-sm text-gray-500">{report.reportedBy.email}</div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="text-sm text-gray-500">
                                    {format(new Date(report.createdAt), "PPp")}
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex space-x-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleBlockEmail(report.id)}
                                        disabled={blockEmailFromReportMutation.isPending}
                                    >
                                        {t("block_email")}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleBlockDomain(report.id)}
                                        disabled={blockDomainFromReportMutation.isPending}
                                    >
                                        {t("block_domain")}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleIgnoreReport(report.id)}
                                        disabled={ignoreReportMutation.isPending}
                                    >
                                        {t("ignore_report")}
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <div className="flex justify-between items-center">
                <Button
                    variant="outline"
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                >
                    {t("previous")}
                </Button>
                <span className="text-sm text-gray-500">
                    {t("page")} {page + 1}
                </span>
                <Button
                    variant="outline"
                    onClick={() => setPage(page + 1)}
                    disabled={!reportedBookings || reportedBookings.length < itemsPerPage}
                >
                    {t("next")}
                </Button>
            </div>
        </div>
    );
}
