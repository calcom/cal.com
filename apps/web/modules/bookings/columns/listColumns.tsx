import { createColumnHelper } from "@tanstack/react-table";

import dayjs from "@calcom/dayjs";
import { isSeparatorRow } from "@calcom/features/data-table/lib/separator";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { AvatarGroup } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";

import type { RowData } from "../types";

interface BuildListDisplayColumnsParams {
  t: (key: string) => string;
  user?: {
    timeZone?: string;
    timeFormat?: number | null;
  } | null;
}

export function buildListDisplayColumns({ t, user }: BuildListDisplayColumnsParams) {
  const columnHelper = createColumnHelper<RowData>();

  return [
    columnHelper.display({
      id: "date",
      header: () => <span className="text-subtle text-sm font-medium">{t("date")}</span>,
      cell: (props) => {
        const row = props.row.original;
        if (isSeparatorRow(row)) return null;

        return (
          <div className="text-default text-sm font-medium">
            {dayjs(row.booking.startTime).tz(user?.timeZone).format("ddd, DD MMM")}
          </div>
        );
      },
    }),
    columnHelper.display({
      id: "time",
      header: () => <span className="text-subtle text-sm font-medium">{t("time")}</span>,
      cell: (props) => {
        const row = props.row.original;
        if (isSeparatorRow(row)) return null;

        const startTime = dayjs(row.booking.startTime).tz(user?.timeZone);
        const endTime = dayjs(row.booking.endTime).tz(user?.timeZone);
        return (
          <div className="text-default text-sm font-medium">
            {startTime.format(user?.timeFormat === 12 ? "h:mma" : "HH:mm")} -{" "}
            {endTime.format(user?.timeFormat === 12 ? "h:mma" : "HH:mm")}
          </div>
        );
      },
    }),
    columnHelper.display({
      id: "event",
      header: () => <span className="text-subtle text-sm font-medium">{t("event")}</span>,
      cell: (props) => {
        const row = props.row.original;
        if (isSeparatorRow(row)) return null;

        return <div className="text-emphasis flex-1 truncate text-sm font-medium">{row.booking.title}</div>;
      },
    }),
    columnHelper.display({
      id: "who",
      header: () => <span className="text-subtle text-sm font-medium">{t("who")}</span>,
      cell: (props) => {
        const row = props.row.original;
        if (isSeparatorRow(row)) return null;

        const items = row.booking.attendees.map((attendee) => ({
          image: getPlaceholderAvatar(null, attendee.name),
          alt: attendee.name,
          title: attendee.name,
          href: null,
        }));

        return <AvatarGroup size="sm" truncateAfter={4} items={items} />;
      },
    }),
    columnHelper.display({
      id: "team",
      header: () => <span className="text-subtle text-sm font-medium">{t("team")}</span>,
      cell: (props) => {
        const row = props.row.original;
        if (isSeparatorRow(row)) return null;

        if (row.booking.eventType.team) {
          return (
            <Badge variant="gray" size="sm">
              {row.booking.eventType.team.name}
            </Badge>
          );
        }
        return null;
      },
    }),
    columnHelper.display({
      id: "actions",
      header: () => null,
      cell: () => null,
    }),
  ];
}
