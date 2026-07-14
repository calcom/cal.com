"use client";

import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { TextField } from "@calcom/ui/components/form";
import { Table } from "@calcom/ui/components/table";
import { keepPreviousData } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";

const { Cell, ColumnTitle, Header, Row } = Table;

const FETCH_LIMIT = 50;

export default function ClientsListingView() {
  const { t } = useLocale();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const { data } = trpc.viewer.clients.list.useQuery(
    {
      searchTerm: debouncedSearchTerm,
      limit: FETCH_LIMIT,
    },
    {
      placeholderData: keepPreviousData,
    }
  );

  const clients = useMemo(() => data?.clients ?? [], [data]);

  return (
    <div className="flex flex-col gap-4">
      <TextField
        placeholder={t("search")}
        label={t("search")}
        onChange={(e) => setSearchTerm(e.target.value)}
        type="search"
      />

      {clients.length === 0 ? (
        <p className="text-sm text-subtle">{t("no_clients_found")}</p>
      ) : (
        <div className="rounded-md border border-subtle">
          <Table>
            <Header>
              <ColumnTitle widthClassNames="w-auto">{t("client")}</ColumnTitle>
              <ColumnTitle>{t("total_bookings")}</ColumnTitle>
              <ColumnTitle>{t("total_spent")}</ColumnTitle>
              <ColumnTitle>{t("last_booking")}</ColumnTitle>
            </Header>
            <tbody className="divide-y divide-subtle rounded-md">
              {clients.map((client) => (
                <Row key={client.email}>
                  <Cell widthClassNames="w-auto">
                    <Link
                      href={`/bookings/clients/${encodeURIComponent(client.email)}`}
                      className="flex flex-col text-default hover:text-emphasis">
                      <span className="font-medium">{client.name}</span>
                      <span className="text-sm text-subtle">{client.email}</span>
                    </Link>
                  </Cell>
                  <Cell>
                    <Badge variant="gray">{client.totalBookings}</Badge>
                  </Cell>
                  <Cell>
                    {client.totalSpent > 0
                      ? `${(client.totalSpent / 100).toFixed(2)} ${client.currency.toUpperCase()}`
                      : "—"}
                  </Cell>
                  <Cell className="text-sm text-subtle">
                    {new Intl.DateTimeFormat(undefined, {
                      dateStyle: "medium",
                    }).format(new Date(client.lastBookingAt))}
                  </Cell>
                </Row>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      {data && (
        <p className="text-sm text-subtle">{t("showing_x_of_y", { x: clients.length, y: data.total })}</p>
      )}
    </div>
  );
}
