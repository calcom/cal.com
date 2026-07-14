"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Table } from "@calcom/ui/components/table";
import Link from "next/link";

const { Cell, ColumnTitle, Header, Row } = Table;

const statusVariant: Record<string, "green" | "red" | "orange" | "gray" | "blue" | "purple"> = {
  ACCEPTED: "green",
  PENDING: "orange",
  CANCELLED: "red",
  REJECTED: "red",
};

export default function ClientDetailView({ email }: { email: string }) {
  const { t } = useLocale();
  const decodedEmail = decodeURIComponent(email);

  const { data, isLoading } = trpc.viewer.clients.get.useQuery({
    email: decodedEmail,
  });

  if (isLoading) {
    return <p className="text-sm text-subtle">{t("loading")}</p>;
  }

  if (!data) {
    return <p className="text-sm text-subtle">{t("client_not_found")}</p>;
  }

  const { client, bookings } = data;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-md border border-subtle px-6 py-4">
        <h2 className="font-cal text-emphasis text-lg">{client.name}</h2>
        <p className="text-sm text-subtle">{client.email}</p>
        <div className="mt-3 flex gap-6">
          <div>
            <span className="text-subtle text-xs">{t("total_bookings")}</span>
            <p className="font-medium">{client.totalBookings}</p>
          </div>
          <div>
            <span className="text-subtle text-xs">{t("total_spent")}</span>
            <p className="font-medium">
              {client.totalSpent > 0 ? `${(client.totalSpent / 100).toFixed(2)}` : "—"}
            </p>
          </div>
        </div>
      </div>

      {bookings.length === 0 ? (
        <p className="text-sm text-subtle">{t("no_bookings")}</p>
      ) : (
        <div className="rounded-md border border-subtle">
          <Table>
            <Header>
              <ColumnTitle widthClassNames="w-auto">{t("event")}</ColumnTitle>
              <ColumnTitle>{t("date")}</ColumnTitle>
              <ColumnTitle>{t("status")}</ColumnTitle>
              <ColumnTitle>{t("amount")}</ColumnTitle>
            </Header>
            <tbody className="divide-y divide-subtle rounded-md">
              {bookings.map((booking) => {
                const paidAmount = booking.payment
                  .filter((p) => p.success)
                  .reduce((sum, p) => sum + p.amount, 0);
                const currency = booking.payment.find((p) => p.success)?.currency ?? "usd";

                return (
                  <Row key={booking.uid}>
                    <Cell widthClassNames="w-auto">
                      <Link
                        href={`/booking/${booking.uid}`}
                        className="font-medium text-default hover:text-emphasis">
                        {booking.eventType?.title ?? booking.title}
                      </Link>
                    </Cell>
                    <Cell className="text-sm text-subtle">
                      {new Intl.DateTimeFormat(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(booking.startTime))}
                    </Cell>
                    <Cell>
                      <Badge variant={statusVariant[booking.status] ?? "gray"}>
                        {booking.status.toLowerCase()}
                      </Badge>
                    </Cell>
                    <Cell className="text-sm text-subtle">
                      {paidAmount > 0 ? `${(paidAmount / 100).toFixed(2)} ${currency.toUpperCase()}` : "—"}
                    </Cell>
                  </Row>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
}
