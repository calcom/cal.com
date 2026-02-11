import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter, DialogClose } from "@calcom/ui/components/dialog";
import { Form } from "@calcom/ui/components/form";
import { CheckboxField } from "@calcom/ui/components/form";

export const BulkUpdateEventSchema = z.object({
  eventTypeIds: z.array(z.number()),
});

export type BulkUpdatParams = { eventTypeIds: number[]; callback: () => void };
export type EventTypes = Array<{ id: number; title: string }>;

export function BulkEditDefaultForEventsModal({
  eventTypes,
  isEventTypesFetching,
  ...props
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  bulkUpdateFunction: (params: BulkUpdatParams) => void;
  isPending: boolean;
  description: string;
  isEventTypesFetching?: boolean;
  eventTypes?: EventTypes;
  handleBulkEditDialogToggle: () => void;
}) {
  const { t } = useLocale();

  const form = useForm({
    resolver: zodResolver(BulkUpdateEventSchema),
    defaultValues: {
      eventTypeIds: eventTypes?.map((e) => e.id) ?? [],
    },
  });

  const eventTypesSelected = form.watch("eventTypeIds");
  const isButtonDisabled = eventTypesSelected.length === 0;

  if (isEventTypesFetching || !open || !eventTypes) return null;

  return (
    <Dialog name="Bulk Default Location Update" open={props.open} onOpenChange={props.setOpen}>
      <DialogContent
        type="creation"
        title={t("default_conferencing_bulk_title")}
        description={props.description}
        enableOverflow>
        <Form
          form={form}
          handleSubmit={(values) => {
            props.bulkUpdateFunction({
              eventTypeIds: values.eventTypeIds,
              callback: () => props.setOpen(false),
            });
          }}>
          <div className="flex flex-col stack-y-2">
            {eventTypes.length > 0 && (
              <div className="flex items-center space-x-2 rounded-md px-3 pb-2.5 pt-1">
                <CheckboxField
                  description={t("select_all")}
                  descriptionAsLabel
                  onChange={(e) => {
                    form.setValue("eventTypeIds", e.target.checked ? eventTypes.map((e) => e.id) : []);
                  }}
                  checked={eventTypesSelected.length === eventTypes.length}
                />
              </div>
            )}
            {eventTypes.map((eventType) => (
              <div
                key={eventType.id}
                className="bg-cal-muted flex items-center space-x-2 rounded-md px-3 py-2.5">
                <CheckboxField
                  description={eventType.title}
                  descriptionAsLabel
                  checked={eventTypesSelected.includes(eventType.id)}
                  onChange={(e) => {
                    form.setValue(
                      "eventTypeIds",
                      e.target.checked
                        ? [...eventTypesSelected, eventType.id]
                        : eventTypesSelected.filter((id) => id !== eventType.id)
                    );
                  }}
                />
              </div>
            ))}
          </div>
          <DialogFooter showDivider className="mt-10">
            <DialogClose
              onClick={() => {
                props.handleBulkEditDialogToggle();
              }}
            />
            <Button type="submit" color="primary" loading={props.isPending} disabled={isButtonDisabled}>
              {t("update")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
