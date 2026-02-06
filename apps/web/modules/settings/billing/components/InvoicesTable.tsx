"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect, useRef } from "react";

import dayjs from "@calcom/dayjs";
import {
  DataTableProvider,
  ColumnFilterType,
  useFilterValue,
  ZDateRangeFilterValue,
  type FilterableColumn,
} from "@calcom/features/data-table";
import { useSegments } from "@calcom/features/data-table/hooks/useSegments";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { FilterType } from "@calcom/types/data-table";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { PanelCard } from "@calcom/ui/components/card";
import { Icon } from "@calcom/ui/components/icon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@calcom/ui/components/table/TableNew";

import { DateRangeFilter } from "~/data-table/components";

import { InvoicesTableSkeleton } from "./InvoicesTableSkeleton";

const DEFAULT_PAGE_SIZE = 10;

const createdAtColumn: Extract<FilterableColumn, { type: Extract<FilterType, "dr"> }> = {
  id: "createdAt",
  title: "Date",
  type: ColumnFilterType.DATE_RANGE,
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function getStatusBadgeColor(status: string | null): "green" | "orange" | "gray" | "red" {
  switch (status) {
    case "paid":
      return "green";
    case "open":
      return "orange";
    case "draft":
      return "gray";
    case "void":
    case "uncollectible":
      return "red";
    default:
      return "gray";
  }
}

export function InvoicesTable() {
  const pathname = usePathname();

  if (!pathname) return null;

  return (
    <DataTableProvider tableIdentifier={`${pathname}-invoices`} useSegments={useSegments}>
      <InvoicesTableContent />
    </DataTableProvider>
  );
}

function InvoicesTableContent() {
  const { t } = useLocale();
  const pathname = usePathname();
  const session = useSession();
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [currentPage, setCurrentPage] = useState(0);

  const dateRangeFilter = useFilterValue("createdAt", ZDateRangeFilterValue)?.data;

  // Derive teamId from context (same logic as billing-view.tsx)
  const getTeamIdFromContext = () => {
    if (!pathname) return null;
    if (pathname.includes("/teams/") && pathname.includes("/billing")) {
      const teamIdMatch = pathname.match(/\/teams\/(\d+)\/billing/);
      return teamIdMatch ? parseInt(teamIdMatch[1], 10) : null;
    }
    if (pathname.includes("/organizations/billing")) {
      return session.data?.user?.org?.id ?? null;
    }
    return null;
  };

  const teamId = getTeamIdFromContext();

  const startDate = dateRangeFilter?.startDate ? new Date(dateRangeFilter.startDate) : undefined;
  const endDate = dateRangeFilter?.endDate ? new Date(dateRangeFilter.endDate) : undefined;

  const { data, isLoading, isFetching } = trpc.viewer.teams.listInvoices.useQuery(
    {
      teamId: teamId!,
      limit: DEFAULT_PAGE_SIZE,
      cursor: cursors[currentPage],
      startDate,
      endDate,
    },
    { enabled: !!teamId, placeholderData: keepPreviousData }
  );

  // Reset pagination when date filter changes
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setCursors([null]);
    setCurrentPage(0);
  }, [dateRangeFilter?.startDate, dateRangeFilter?.endDate]);

  if (!teamId) return null;
  if (isLoading) return <InvoicesTableSkeleton />;

  const handleNextPage = () => {
    if (data?.nextCursor) {
      setCursors((prev) => [...prev, data.nextCursor]);
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  return (
    <PanelCard
      title={t("invoices")}
      headerContent={<DateRangeFilter column={createdAtColumn} />}
      className="mt-5">
      {!data?.invoices.length && currentPage === 0 ? (
        <div className="text-subtle p-6 text-center text-sm">{t("no_invoices_in_date_range")}</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead>{t("invoice_number")}</TableHead>
                  <TableHead>{t("amount")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("description")}</TableHead>
                  <TableHead className="text-right">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>{dayjs.unix(invoice.created).format("MMM D, YYYY")}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {invoice.number && invoice.hostedInvoiceUrl ? (
                        <a
                          href={invoice.hostedInvoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline">
                          {invoice.number}
                          <Icon name="external-link" className="h-3 w-3" />
                        </a>
                      ) : (
                        invoice.number || "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(invoice.amountPaid || invoice.amountDue, invoice.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge color={getStatusBadgeColor(invoice.status)}>
                        {invoice.status ? t(`invoice_status_${invoice.status}`) : "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {invoice.description || invoice.lineItems[0]?.description || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {invoice.invoicePdf && (
                        <Button
                          variant="icon"
                          color="minimal"
                          href={invoice.invoicePdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          StartIcon="download"
                          tooltip={t("download_pdf")}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {(currentPage > 0 || data?.hasMore) && (
            <div className="border-muted flex items-center justify-end gap-2 border-t px-4 py-3">
              <Button
                color="secondary"
                size="sm"
                onClick={handlePrevPage}
                disabled={currentPage === 0 || isFetching}
                StartIcon="arrow-left">
                {t("previous")}
              </Button>
              <Button
                color="secondary"
                size="sm"
                onClick={handleNextPage}
                disabled={!data?.hasMore || isFetching}
                EndIcon="arrow-right">
                {t("next")}
              </Button>
            </div>
          )}
        </>
      )}
    </PanelCard>
  );
}
