import { cn } from "@calid/features/lib/cn";
import { Badge } from "@calid/features/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@calid/features/ui/components/card";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import type { ContactMeeting } from "../types";
import { MeetingCard } from "./MeetingCard";

interface MeetingsSectionProps {
  title: React.ReactNode;
  meetings: ContactMeeting[];
  emptyLabel: string;
  countBadge?: boolean;
  isLoading?: boolean;
  errorMessage?: string | null;
  className?: string;
}

export const MeetingsSection = ({
  title,
  meetings,
  emptyLabel,
  countBadge = false,
  isLoading = false,
  errorMessage = null,
  className,
}: MeetingsSectionProps) => {
  const { t } = useLocale();

  return (
    <Card className={cn("flex h-full min-h-0 flex-col", className)}>
      <CardHeader className="shrink-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          {title}
          {countBadge && meetings.length > 0 ? (
            <Badge variant="secondary" size="xs" className="ml-1 text-[10px]">
              {meetings.length}
            </Badge>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1">
        <div className="h-full min-h-0 overflow-y-auto pr-1">
          {isLoading ? (
            <p className="text-muted-foreground py-4 text-center text-sm">{t("contacts_loading_meetings")}</p>
          ) : errorMessage ? (
            <p className="text-destructive py-4 text-center text-sm">{errorMessage}</p>
          ) : meetings.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">{emptyLabel}</p>
          ) : (
            <div className="space-y-2">
              {meetings.map((meeting) => (
                <MeetingCard key={meeting.instanceId} meeting={meeting} />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
