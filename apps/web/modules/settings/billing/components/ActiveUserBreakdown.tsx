"use client";

import { useEffect, useState } from "react";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { PanelCard } from "@calcom/ui/components/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPanel,
  SheetTitle,
  SheetClose,
} from "@coss/ui/components/sheet";
import { Skeleton } from "@coss/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coss/ui/components/table";

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
  activeUsers: Array<{ id: number; email: string; name: string | null; activeAs: "host" | "attendee" }>;
  totalMembers: number;
  activeHosts: number;
  activeAttendees: number;
  periodStart: string;
  periodEnd: string;
  pricePerSeat: number | null;
};

type SelectedUser = {
  id: number;
  email: string;
  name: string | null;
  activeAs: "host" | "attendee";
};

function ActiveUserBreakdownContent({ data, teamId }: { data: BreakdownData; teamId: number }) {
  const { t } = useLocale();
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);

  const { activeUsers, totalMembers, activeHosts, activeAttendees, periodStart, periodEnd } = data;

  useEffect(() => {
    setCurrentPage(0);
  }, [activeUsers]);

  const totalPages = Math.ceil(activeUsers.length / PAGE_SIZE);
  const paginatedUsers = activeUsers.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const formattedStart = dayjs.utc(periodStart).format("MMM D, YYYY");
  const formattedEnd = dayjs.utc(periodEnd).format("MMM D, YYYY");

  return (
    <>
      <PanelCard
        title={t("active_users_billing")}
        subtitle={t("active_users_billing_description", {
          start: formattedStart,
          end: formattedEnd,
        })}
        className="mt-5">
        <div className="px-5 py-3">
          <p className="text-subtle text-sm font-medium">
            {t("active_users_summary", {
              hosts: activeHosts,
              attendees: activeAttendees,
              active: activeHosts + activeAttendees,
              total: totalMembers,
            })}
          </p>
        </div>
        {activeUsers.length === 0 ? (
          <div className="text-subtle p-6 text-center text-sm">{t("no_active_users")}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("name")}</TableHead>
                    <TableHead>{t("email")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((user) => (
                    <TableRow
                      key={user.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedUser(user)}>
                      <TableCell>{user.name || "-"}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.activeAs === "host" ? (
                          <Badge variant="success">{t("active_as_host")}</Badge>
                        ) : (
                          <Badge variant="info">{t("active_as_attendee")}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="border-muted flex items-center justify-end gap-2 border-t px-4 py-3">
                <Button
                  color="secondary"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 0}
                  StartIcon="arrow-left">
                  {t("previous")}
                </Button>
                <Button
                  color="secondary"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage >= totalPages - 1}
                  EndIcon="arrow-right">
                  {t("next")}
                </Button>
              </div>
            )}
          </>
        )}
      </PanelCard>

      <Sheet open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <SheetContent side="right" variant="inset">
          <SheetHeader>
            <SheetTitle>{selectedUser?.name || selectedUser?.email}</SheetTitle>
            <SheetDescription>
              <span className="flex items-center gap-2">
                {selectedUser?.email}
                {selectedUser?.activeAs === "host" ? (
                  <Badge variant="success">{t("active_as_host")}</Badge>
                ) : (
                  <Badge variant="info">{t("active_as_attendee")}</Badge>
                )}
              </span>
            </SheetDescription>
          </SheetHeader>

          <SheetPanel>
            {selectedUser && (
              <UserBookingsSheet
                teamId={teamId}
                userId={selectedUser.id}
                activeAs={selectedUser.activeAs}
              />
            )}
          </SheetPanel>

          <SheetFooter>
            <SheetClose render={<Button color="secondary">{t("close")}</Button>} />
          </SheetFooter>
        </SheetContent>
      </Sheet>
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
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold">{bookings.length}</span>
        <span className="text-muted-foreground text-sm">
          {bookings.length === 1 ? t("booking") : t("bookings")}
        </span>
      </div>

      {bookings.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("no_bookings")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("booking")}</TableHead>
              <TableHead>{t("date")}</TableHead>
              <TableHead>{activeAs === "host" ? t("attendees") : t("host")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell className="font-medium">{booking.title}</TableCell>
                <TableCell className="text-muted-foreground">
                  {dayjs.utc(booking.startTime).format("MMM D, YYYY h:mm A")}
                </TableCell>
                <TableCell className="text-muted-foreground">{booking.otherParty || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
