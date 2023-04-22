import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Dialog, DialogContent, Form, DialogFooter, DialogClose, Button, Checkbox } from "@calcom/ui";

export const BulkUpdateEventSchema = z.object({
  eventTypeIds: z.array(z.number()),
});

export function BulkEditDefaultConferencingModal(props: { open: boolean; setOpen: (open: boolean) => void }) {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const { data, isFetching } = trpc.viewer.eventTypes.bulkEventFetch.useQuery();
  const form = useForm({
    resolver: zodResolver(BulkUpdateEventSchema),
    defaultValues: {
      eventTypeIds: data?.eventTypes.map((e) => e.id) ?? [],
    },
  });

  const updateLocationsMutation = trpc.viewer.eventTypes.bulkUpdateToDefaultLocation.useMutation({
    onSuccess: () => {
      utils.viewer.getUsersDefaultConferencingApp.invalidate();
      props.setOpen(false);
    },
  });

  const eventTypesSelected = form.watch("eventTypeIds");

  if (isFetching || !open || !data?.eventTypes) return null;

  return (
    <Dialog name="Bulk Default Location Update" open={props.open} onOpenChange={props.setOpen}>
      <DialogContent
        type="creation"
        title={t("default_conferencing_bulk_title")}
        description={t("default_conferencing_bulk_description")}
        enableOverflow>
        <Form
          form={form}
          handleSubmit={(values) => {
            updateLocationsMutation.mutate(values);
          }}>
          <div className="flex flex-col space-y-2">
            {data.eventTypes.length > 0 && (
              <div className="flex items-center space-x-2 rounded-md py-2.5 px-3">
                <Checkbox
                  description={t("select_all")}
                  descriptionAsLabel
                  onChange={(e) => {
                    form.setValue("eventTypeIds", e.target.checked ? data.eventTypes.map((e) => e.id) : []);
                  }}
                  checked={eventTypesSelected.length === data.eventTypes.length}
                />
              </div>
            )}
            {data.eventTypes.map((eventType) => (
              <div key={eventType.id} className="bg-muted flex items-center space-x-2 rounded-md py-2.5 px-3">
                <Checkbox
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
          <DialogFooter>
            <DialogClose
              onClick={() => {
                utils.viewer.getUsersDefaultConferencingApp.invalidate();
              }}
            />
            <Button type="submit" color="primary" loading={updateLocationsMutation.isLoading}>
              {t("update")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
