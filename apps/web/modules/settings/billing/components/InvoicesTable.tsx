"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect, useRef } from "react";

import dayjs from "@calcom/dayjs";
import { ColumnFilterType, ZDateRangeFilterValue } from "@calcom/features/data-table";
import {
  CUSTOM_PRESET_VALUE,
  DEFAULT_PRESET,
  getCompatiblePresets,
  getDateRangeFromPreset,
  getDefaultEndDate,
  getDefaultStartDate,
} from "@calcom/features/data-table/lib/dateRange";
import { DataTableProvider } from "~/data-table/DataTableProvider";
import { useDataTable } from "~/data-table/hooks/useDataTable";
import { useFilterValue } from "~/data-table/hooks/useFilterValue";
import { useSegments } from "~/data-table/hooks/useSegments";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardFrame,
  CardFrameFooter,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@coss/ui/components/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@coss/ui/components/table";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@coss/ui/components/tooltip";
import { DownloadIcon, ExternalLinkIcon, FileTextIcon } from "@coss/ui/icons";
import { DateRangeFilter, type DateRangeValue } from "@coss/ui/shared/daterange-filter";

import { InvoicesTableSkeleton } from "./InvoicesTableSkeleton";

const DEFAULT_PAGE_SIZE = 10;

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function getStatusBadgeVariant(status: string | null): "success" | "warning" | "secondary" | "error" {
  switch (status) {
    case "paid":
      return "success";
    case "open":
      return "warning";
    case "draft":
      return "secondary";
    case "void":
    case "uncollectible":
      return "error";
    default:
      return "secondary";
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
  const { updateFilter } = useDataTable();
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [currentPage, setCurrentPage] = useState(0);

  const dateRangeFilter = useFilterValue("createdAt", ZDateRangeFilterValue)?.data;
  const [selectedInvoicePreset, setSelectedInvoicePreset] = useState<string | null>(
    dateRangeFilter?.preset ?? DEFAULT_PRESET.value
  );
  const [invoiceRange, setInvoiceRange] = useState<DateRangeValue | undefined>(() => {
    if (!dateRangeFilter?.startDate || !dateRangeFilter?.endDate) return undefined;
    return { from: new Date(dateRangeFilter.startDate), to: new Date(dateRangeFilter.endDate) };
  });
  const [invoiceMonth, setInvoiceMonth] = useState<Date>(
    dateRangeFilter?.startDate ? new Date(dateRangeFilter.startDate) : new Date()
  );

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

  useEffect(() => {
    if (dateRangeFilter) return;
    const defaultStart = getDefaultStartDate();
    const defaultEnd = getDefaultEndDate();
    updateFilter("createdAt", {
      type: ColumnFilterType.DATE_RANGE,
      data: {
        startDate: defaultStart.toISOString(),
        endDate: defaultEnd.toISOString(),
        preset: DEFAULT_PRESET.value,
      },
    });
    setSelectedInvoicePreset(DEFAULT_PRESET.value);
    setInvoiceMonth(defaultStart.toDate());
    setInvoiceRange({ from: defaultStart.toDate(), to: defaultEnd.toDate() });
  }, [dateRangeFilter, updateFilter]);

  useEffect(() => {
    if (!dateRangeFilter) return;
    setSelectedInvoicePreset(dateRangeFilter.preset ?? DEFAULT_PRESET.value);
    if (dateRangeFilter.startDate && dateRangeFilter.endDate) {
      setInvoiceRange({
        from: new Date(dateRangeFilter.startDate),
        to: new Date(dateRangeFilter.endDate),
      });
      setInvoiceMonth(new Date(dateRangeFilter.startDate));
    }
  }, [dateRangeFilter]);

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

  const compatiblePresets = getCompatiblePresets("past");

  const invoicePresets = compatiblePresets
    .filter((preset) => preset.value !== CUSTOM_PRESET_VALUE)
    .map((preset) => ({
      label: t(preset.labelKey, preset.i18nOptions),
      value: preset.value,
      onClick: () => {
        const { startDate: presetStartDate, endDate: presetEndDate, preset: selectedPreset } = getDateRangeFromPreset(
          preset.value
        );
        setSelectedInvoicePreset(selectedPreset.value);
        setInvoiceMonth(presetStartDate.toDate());
        setInvoiceRange({ from: presetStartDate.toDate(), to: presetEndDate.toDate() });
        updateFilter("createdAt", {
          type: ColumnFilterType.DATE_RANGE,
          data: {
            startDate: presetStartDate.toISOString(),
            endDate: presetEndDate.toISOString(),
            preset: selectedPreset.value,
          },
        });
      },
    }));

  const invoiceRangeLabel =
    selectedInvoicePreset && selectedInvoicePreset !== CUSTOM_PRESET_VALUE
      ? t(
        compatiblePresets.find((preset) => preset.value === selectedInvoicePreset)?.labelKey ??
        DEFAULT_PRESET.labelKey,
        compatiblePresets.find((preset) => preset.value === selectedInvoicePreset)?.i18nOptions ??
        DEFAULT_PRESET.i18nOptions
      )
      : invoiceRange?.from && invoiceRange?.to
        ? `${dayjs(invoiceRange.from).format("MMM D, YYYY")} - ${dayjs(invoiceRange.to).format("MMM D, YYYY")}`
        : t("date_range");

  return (
    <CardFrame>
      <CardFrameHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardFrameTitle>{t("invoices")}</CardFrameTitle>
        <DateRangeFilter
          invoiceRangeLabel={invoiceRangeLabel}
          invoicePresets={invoicePresets}
          selectedInvoicePreset={selectedInvoicePreset}
          invoiceMonth={invoiceMonth}
          setInvoiceMonth={setInvoiceMonth}
          invoiceRange={invoiceRange}
          setInvoiceRange={(range) => {
            setInvoiceRange(range);
            if (!range?.from || !range?.to) return;
            updateFilter("createdAt", {
              type: ColumnFilterType.DATE_RANGE,
              data: {
                startDate: dayjs(range.from).startOf("day").toISOString(),
                endDate: dayjs(range.to).endOf("day").toISOString(),
                preset: CUSTOM_PRESET_VALUE,
              },
            });
          }}
          setSelectedInvoicePreset={setSelectedInvoicePreset}
        />
      </CardFrameHeader>
      <Card>
        {!data?.invoices.length && currentPage === 0 ? (
          <CardPanel className="p-0">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileTextIcon />
                </EmptyMedia>
                <EmptyTitle>{t("no_invoices_found")}</EmptyTitle>
                <EmptyDescription>{t("no_invoices_in_date_range")}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardPanel>
        ) : (
          <CardPanel className="px-4 pt-1 pb-4">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
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
                  <TableRow key={invoice.id} className="hover:bg-transparent">
                    <TableCell>{dayjs.unix(invoice.created).format("MMM D, YYYY")}</TableCell>
                    <TableCell className="font-medium text-sm">
                      {invoice.number && invoice.hostedInvoiceUrl ? (
                        <a
                          href={invoice.hostedInvoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 hover:underline">
                          {invoice.number}
                          <ExternalLinkIcon className="size-3.5" />
                        </a>
                      ) : (
                        invoice.number || "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(invoice.amountPaid || invoice.amountDue, invoice.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(invoice.status)}>
                        {invoice.status ? t(`invoice_status_${invoice.status}`) : "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-60 truncate">
                      {invoice.description || invoice.lineItems[0]?.description || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {invoice.invoicePdf && (
                        <Tooltip>
                          <TooltipTrigger render={<span className="inline-flex" />}>
                            <Button
                              render={
                                <a
                                  href={invoice.invoicePdf}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={t("download_pdf")}
                                />
                              }
                              size="icon-sm"
                              variant="ghost">
                              <DownloadIcon />
                            </Button>
                          </TooltipTrigger>
                          <TooltipPopup>{t("download")}</TooltipPopup>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardPanel>
        )}
      </Card>
      {(currentPage > 0 || data?.hasMore) && (
        <CardFrameFooter className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage === 0 || isFetching}>
            {t("previous")}
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextPage} disabled={!data?.hasMore || isFetching}>
            {t("next")}
          </Button>
        </CardFrameFooter>
      )}
    </CardFrame>
  );
}
