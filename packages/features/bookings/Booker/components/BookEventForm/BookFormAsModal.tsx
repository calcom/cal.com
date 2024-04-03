import type { ReactNode } from "react";

import { useIsPlatform, useGetEventTypeById } from "@calcom/atoms/monorepo";
import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge, Dialog, DialogContent } from "@calcom/ui";

import { useTimePreferences } from "../../../lib";
import { useBookerStore } from "../../store";
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
  const { t } = useLocale();
  const selectedTimeslot = useBookerStore((state) => state.selectedTimeslot);
  const selectedDuration = useBookerStore((state) => state.selectedDuration);
  const parsedSelectedTimeslot = dayjs(selectedTimeslot);
  const { timeFormat, timezone } = useTimePreferences();
  if (!selectedTimeslot) {
    return null;
  }
  return (
    <>
      <h1 className="font-cal text-emphasis text-xl leading-5">{t("confirm_your_details")} </h1>
      <div className="my-4 flex space-x-2 rounded-md leading-none">
        <Badge variant="grayWithoutHover" startIcon="calendar" size="lg">
          <span>
            {parsedSelectedTimeslot.format("LL")} {parsedSelectedTimeslot.tz(timezone).format(timeFormat)}
          </span>
        </Badge>
        {(selectedDuration || eventLength) && (
          <Badge variant="grayWithoutHover" startIcon="clock" size="lg">
            <span>{selectedDuration || eventLength}</span>
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
