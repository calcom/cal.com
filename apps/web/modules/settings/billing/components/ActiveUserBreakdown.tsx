"use client";

import { useEffect, useState } from "react";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameFooter,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@coss/ui/components/empty";
import {
  Drawer,
  DrawerDescription,
  DrawerHeader,
  DrawerPopup,
  DrawerPanel,
  DrawerTitle,
} from "@coss/ui/components/drawer";
import { Skeleton } from "@coss/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coss/ui/components/table";
import { FileTextIcon } from "@coss/ui/icons";

import { ActiveUserBreakdownSkeleton } from "./ActiveUserBreakdownSkeleton";

const PAGE_SIZE = 10;

export function ActiveUserBreakdown({ teamId }: { teamId: number }) {
  const { data, isLoading } = trpc.viewer.teams.getActiveUserBreakdown.useQuery(
    { teamId },
    { enabled: !!teamId }
  );

  if (isLoading) return <ActiveUserBreakdownSkeleton />;
  if (!data) return null;

  return <ActiveUserBreakdownContent data={data} teamId={teamId} />;
}

type BreakdownData = {
  activeUsers: Array<{
    id: number;
    email: string;
    name: string | null;
    activeAs: "host" | "attendee";
  }>;
  totalMembers: number;
  activeHosts: number;
  activeAttendees: number;
  periodStart: string;
  periodEnd: string;
  pricePerSeat: number | null;
  minSeats: number | null;
};

type SelectedUser = {
  id: number;
  email: string;
  name: string | null;
  activeAs: "host" | "attendee";
};

type SeatRowProps = {
  label: string;
  value: number;
  isBold?: boolean;
  underline?: "dashed" | "solid";
  className?: string;
};

function SeatRow({ label, value, isBold = false, underline, className = "" }: SeatRowProps) {
  const numberFormatter = new Intl.NumberFormat();
  return (
    <div
      className={classNames(
        "py-1.5 px-2.5 flex justify-between",
        underline === "dashed"
          ? "border-b border-dashed"
          : underline === "solid"
            ? "border-b"
            : undefined,
        className
      )}
    >
      <span
        className={classNames(
          "text-sm",
          isBold ? "font-semibold" : "font-medium text-muted-foreground"
        )}
      >
        {label}
      </span>
      <span
        className={classNames(
          "text-sm",
          isBold ? "font-semibold" : "font-medium text-muted-foreground"
        )}
      >
        {numberFormatter.format(value)}
      </span>
    </div>
  );
}

function ActiveUserBreakdownContent({
  data,
  teamId,
}: {
  data: BreakdownData;
  teamId: number;
}) {
  const { t } = useLocale();
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);

  const {
    activeUsers,
    totalMembers,
    activeHosts,
    activeAttendees,
    periodStart,
    periodEnd,
    minSeats,
  } = data;

  useEffect(() => {
    setCurrentPage(0);
  }, [activeUsers]);

  const totalPages = Math.ceil(activeUsers.length / PAGE_SIZE);
  const paginatedUsers = activeUsers.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE
  );

  const formattedStart = dayjs.utc(periodStart).format("MMM D, YYYY");
  const formattedEnd = dayjs.utc(periodEnd).format("MMM D, YYYY");

  const totalActive = activeHosts + activeAttendees;
  const billedSeats = minSeats ? Math.max(totalActive, minSeats) : totalActive;

  return (
    <>
      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle>{t("active_users_billing")}</CardFrameTitle>
          <CardFrameDescription>
            {t("active_users_billing_description", {
              start: formattedStart,
              end: formattedEnd,
            })}
          </CardFrameDescription>
        </CardFrameHeader>
        <Card>
          {activeUsers.length > 0 ? (
            <CardPanel className="px-4 pt-1 pb-4">
              <div className="my-3">
                <SeatRow
                  label={t("total_members")}
                  value={totalMembers}
                  underline="dashed"
                />
                <SeatRow
                  label={t("active_users_count")}
                  value={totalActive}
                  underline="dashed"
                />
                {minSeats ? (
                  <SeatRow
                    label={t("min_seats_commitment")}
                    value={minSeats}
                    underline="solid"
                  />
                ) : null}
                <SeatRow label={t("billed_seats")} value={billedSeats} isBold />
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>{t("name")}</TableHead>
                    <TableHead>{t("email")}</TableHead>
                    <TableHead className="text-right">{t("status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((user) => (
                    <TableRow
                      key={user.id}
                      className="cursor-pointer hover:bg-transparent hover:*:bg-muted last:*:first:rounded-es-lg last:*:last:rounded-ee-lg"
                      onClick={() => setSelectedUser(user)}
                    >
                      <TableCell>{user.name || "-"}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell className="text-right">
                        {user.activeAs === "host" ? (
                          <Badge variant="success">
                            {t("active_as_host")}
                          </Badge>
                        ) : (
                          <Badge variant="info">
                            {t("active_as_attendee")}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardPanel>
          ) : (
            <CardPanel className="p-0">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FileTextIcon />
                  </EmptyMedia>
                  <EmptyTitle>{t("no_active_users")}</EmptyTitle>
                  <EmptyDescription>{t("active_users_billing_description", { start: formattedStart, end: formattedEnd })}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            </CardPanel>
          )}
        </Card>
        {totalPages > 1 && (
          <CardFrameFooter className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 0}
            >
              {t("previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage >= totalPages - 1}
            >
              {t("next")}
            </Button>
          </CardFrameFooter>
        )}
      </CardFrame>

      <Drawer
        open={!!selectedUser}
        onOpenChange={(open) => !open && setSelectedUser(null)}
        position="bottom"
      >
        <DrawerPopup showBar>
          <DrawerHeader>
            <DrawerTitle>{selectedUser?.name || selectedUser?.email}</DrawerTitle>
            <DrawerDescription>
              <span className="flex items-center gap-2">
                {selectedUser?.email}
                {selectedUser?.activeAs === "host" ? (
                  <Badge variant="success">{t("active_as_host")}</Badge>
                ) : (
                  <Badge variant="info">{t("active_as_attendee")}</Badge>
                )}
              </span>
            </DrawerDescription>
          </DrawerHeader>
          <DrawerPanel>
            {selectedUser && (
              <UserBookingsSheet
                teamId={teamId}
                userId={selectedUser.id}
                activeAs={selectedUser.activeAs}
              />
            )}
          </DrawerPanel>
        </DrawerPopup>
      </Drawer>
    </>
  );
}

function UserBookingsSheet({
  teamId,
  userId,
  activeAs,
}: {
  teamId: number;
  userId: number;
  activeAs: "host" | "attendee";
}) {
  const { t } = useLocale();

  const { data, isLoading } = trpc.viewer.teams.getActiveUserBookings.useQuery(
    { teamId, userId, activeAs },
    { enabled: true }
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  const bookings = data?.bookings ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="font-semibold text-sm">
        {bookings.length} {bookings.length === 1 ? t("booking") : t("bookings")}
      </div>

      {bookings.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("no_bookings")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("booking")}</TableHead>
              <TableHead>{t("date")}</TableHead>
              <TableHead>
                {activeAs === "host" ? t("attendees") : t("host")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell className="font-medium">{booking.title}</TableCell>
                <TableCell className="text-muted-foreground">
                  {dayjs.utc(booking.startTime).format("MMM D, YYYY h:mm A")}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {booking.otherParty || "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
