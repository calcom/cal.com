import { Calendar, Clock } from "lucide-react";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge, Dialog, DialogContent } from "@calcom/ui";

import { useBookerStore } from "../../store";
import { useEvent } from "../../utils/event";
import { BookEventForm } from "./BookEventForm";

export function BookFormAsModal({ visible, onCancel }: { visible: boolean; onCancel: () => void }) {
  const { t } = useLocale();
  const selectedTimeslot = useBookerStore((state) => state.selectedTimeslot);
  const selectedDuration = useBookerStore((state) => state.selectedDuration);
  const { data } = useEvent();
  const parsedSelectedTimeslot = dayjs(selectedTimeslot);

  return (
    <Dialog open={visible} onOpenChange={onCancel}>
      <DialogContent type={undefined} enableOverflow className="max-h-[45vh]">
        <h1 className="font-cal text-emphasis text-lg leading-5">{t("confirm_your_details")} </h1>
        <div className="mt-6 flex space-x-2 rounded-md leading-none">
          <Badge variant="grayWithoutHover" startIcon={Calendar} size="lg">
            <span>{parsedSelectedTimeslot.format("LLL")}</span>
          </Badge>
          {selectedDuration ||
            (data?.length && (
              <Badge variant="grayWithoutHover" startIcon={Clock} size="lg">
                <span>{selectedDuration || data.length}</span>
              </Badge>
            ))}
        </div>
        <BookEventForm onCancel={onCancel} />
      </DialogContent>
    </Dialog>
  );
}
