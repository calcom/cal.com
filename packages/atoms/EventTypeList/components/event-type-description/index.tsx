import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";
import type { Prisma } from "prisma/client";
import type { z } from "zod";

import type { baseEventTypeSelect } from "@calcom/prisma";
import type { EventTypeModel } from "@calcom/prisma/zod";

type EventTypeDescriptionProps = {
  eventType: Pick<
    z.infer<typeof EventTypeModel>,
    Exclude<keyof typeof baseEventTypeSelect, "recurringEvent"> | "metadata"
  > & {
    descriptionAsSafeHTML?: string | null;
    recurringEvent: Prisma.JsonValue;
    seatsPerTimeSlot?: number;
  };
  className: string;
  shortenDescription?: boolean;
  isPublic?: boolean;
};

export function EventTypeDescription({
  eventType,
  className,
  shortenDescription,
  isPublic,
}: EventTypeDescriptionProps) {
  return (
    <>
      <div className={cn("text-subtle", className)}>
        {eventType.description && (
          <div
            className={cn(
              "text-subtle line-clamp-3 break-words py-1 text-sm sm:max-w-[650px] [&_a]:text-blue-500 [&_a]:underline [&_a]:hover:text-blue-600",
              shortenDescription ? "line-clamp-4 [&>*:not(:first-child)]:hidden" : ""
            )}
            dangerouslySetInnerHTML={{
              __html: eventType.descriptionAsSafeHTML || "",
            }}
          />
        )}
        <ul className="mt-2 flex flex-wrap gap-x-2 gap-y-1">
          {eventType.metadata?.multipleDuration ? (
            eventType.metadata.multipleDuration.map((dur, idx) => (
              <li key={idx}>
                <Badge variant="default" className="rounded-sm">
                  <Clock />
                  {dur}m
                </Badge>
              </li>
            ))
          ) : (
            <li>
              <Badge variant="default" className="rounded-sm">
                <Clock />
                {eventType.length}m
              </Badge>
            </li>
          )}
        </ul>
      </div>
    </>
  );
}
