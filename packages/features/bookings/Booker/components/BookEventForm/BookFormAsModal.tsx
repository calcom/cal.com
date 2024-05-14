import type { ReactNode } from "react";
import React from "react";

import { useIsPlatform, useGetEventTypeById } from "@calcom/atoms/monorepo";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge, Dialog, DialogContent } from "@calcom/ui";

import { getDurationFormatted } from "../../../components/event-meta/Duration";
import { useTimePreferences } from "../../../lib";
import { useBookerStore } from "../../store";
import { FromTime } from "../../utils/dates";
import { useEvent } from "../../utils/event";

const BookEventFormWrapper = ({ children, onCancel }: { onCancel: () => void; children: ReactNode }) => {
  const { data } = useEvent();

  return <BookEventFormWrapperComponent child={children} eventLength={data?.length} onCancel={onCancel} />;
};

const PlatformBookEventFormWrapper = ({
  children,
  onCancel,
}: {
  onCancel: () => void;
  children: ReactNode;
}) => {
  const eventId = useBookerStore((state) => state.eventId);
  const { data } = useGetEventTypeById(eventId);

  return (
    <BookEventFormWrapperComponent
      child={children}
      eventLength={data?.eventType.length}
      onCancel={onCancel}
    />
  );
};

export const BookEventFormWrapperComponent = ({
  child,
  eventLength,
}: {
  onCancel: () => void;
  child: ReactNode;
  eventLength?: number;
}) => {
  const { i18n, t } = useLocale();
  const selectedTimeslot = useBookerStore((state) => state.selectedTimeslot);
  const selectedDuration = useBookerStore((state) => state.selectedDuration);
  const { timeFormat, timezone } = useTimePreferences();
  if (!selectedTimeslot) {
    return null;
  }
  return (
    <>
      <h1 className="font-cal text-emphasis text-xl leading-5">{t("confirm_your_details")} </h1>
      <div className="my-4 flex flex-wrap gap-2 rounded-md leading-none">
        <Badge variant="grayWithoutHover" startIcon="calendar" size="lg">
          <FromTime
            date={selectedTimeslot}
            timeFormat={timeFormat}
            timeZone={timezone}
            language={i18n.language}
          />
        </Badge>
        {(selectedDuration || eventLength) && (
          <Badge variant="grayWithoutHover" startIcon="clock" size="lg">
            <span>{getDurationFormatted(selectedDuration || eventLength, t)}</span>
          </Badge>
        )}
      </div>
      {child}
    </>
  );
};

export const BookFormAsModal = ({
  visible,
  onCancel,
  children,
}: {
  visible: boolean;
  onCancel: () => void;
  children: ReactNode;
}) => {
  const isPlatform = useIsPlatform();

  return (
    <Dialog open={visible} onOpenChange={onCancel}>
      <DialogContent
        type={undefined}
        enableOverflow
        className="[&_.modalsticky]:border-t-subtle [&_.modalsticky]:bg-default max-h-[80vh] pb-0 [&_.modalsticky]:sticky [&_.modalsticky]:bottom-0 [&_.modalsticky]:left-0 [&_.modalsticky]:right-0 [&_.modalsticky]:-mx-8 [&_.modalsticky]:border-t [&_.modalsticky]:px-8 [&_.modalsticky]:py-4">
        {!isPlatform ? (
          <BookEventFormWrapper onCancel={onCancel}>{children}</BookEventFormWrapper>
        ) : (
          <PlatformBookEventFormWrapper onCancel={onCancel}>{children}</PlatformBookEventFormWrapper>
        )}
      </DialogContent>
    </Dialog>
  );
};
