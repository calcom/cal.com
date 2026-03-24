import { Badge } from "@calid/features/ui/components/badge";
import { Button } from "@calid/features/ui/components/button";
import { format } from "date-fns";
import { CalendarDays, CheckCircle2, Video, XCircle } from "lucide-react";

import type { ContactMeeting } from "../types";

const meetingStatusConfig = {
  upcoming: { icon: CalendarDays, className: "text-primary", label: "Upcoming" },
  completed: { icon: CheckCircle2, className: "text-emerald-600", label: "Completed" },
  cancelled: { icon: XCircle, className: "text-muted-foreground", label: "Cancelled" },
};

interface MeetingCardProps {
  meeting: ContactMeeting;
}

export const MeetingCard = ({ meeting }: MeetingCardProps) => {
  const statusConfig = meetingStatusConfig[meeting.status];
  const StatusIcon = statusConfig.icon;

  return (
    <div className="border-border hover:bg-muted/30 flex items-center gap-3 rounded-lg border p-3 transition-colors">
      <StatusIcon className={`h-4 w-4 shrink-0 ${statusConfig.className}`} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{meeting.title}</div>
        <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
          <span>{format(meeting.date, "MMM d, yyyy · h:mm a")}</span>
          <span>·</span>
          <span>{meeting.duration} min</span>
        </div>
        {meeting.notes ? (
          <p className="text-muted-foreground mt-1 truncate text-xs">{meeting.notes}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Badge variant="outline" size="xs" className="text-[10px]">
          {statusConfig.label}
        </Badge>
        {meeting.meetingLink && meeting.status === "upcoming" ? (
          <Button
            variant="icon"
            color="minimal"
            size="sm"
            className="h-7 w-7"
            onClick={() => window.open(meeting.meetingLink, "_blank", "noopener,noreferrer")}>
            <Video className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>
    </div>
  );
};
