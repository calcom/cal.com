"use client";

import { Button } from "@calid/features/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@calid/features/ui/components/dialog";
import { triggerToast } from "@calid/features/ui/components/toast";
import { useRouter } from "next/navigation";
import React from "react";

import CreateEventTypeForm from "@calcom/features/eventtypes/components/CreateEventTypeForm";
import { useCalIdCreateEventType } from "@calcom/lib/hooks/useCreateEventType";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import type { CreateEventModalProps } from "../types/event-types";

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  onCreateEvent,
  pageSlug,
  urlPrefix,
}) => {
  const router = useRouter();
  const { t } = useLocale();

  const onSuccessMutation = (eventType: any) => {
    router.push(`/event-types/${eventType.id}?tabName=setup`);
    triggerToast(
      t("event_type_created_successfully", {
        eventTypeTitle: eventType.title,
      }),
      "success"
    );
    onClose();
    onCreateEvent?.(eventType);
  };

  const onErrorMutation = (err: string) => {
    triggerToast(err, "error");
  };

  const { form, createMutation, isManagedEventType } = useCalIdCreateEventType(
    onSuccessMutation,
    onErrorMutation
  );

  const SubmitButton = (isPending: boolean) => {
    return (
      <DialogFooter>
        <DialogClose />
        <Button type="submit" loading={isPending}>
          {t("continue")}
        </Button>
      </DialogFooter>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Add a new event type</DialogTitle>
          <DialogDescription className="text-sm">
            Create a new event type for people to book times with.
          </DialogDescription>
        </DialogHeader>

        <CreateEventTypeForm
          urlPrefix={urlPrefix}
          isPending={createMutation.isPending}
          form={form}
          isManagedEventType={isManagedEventType}
          handleSubmit={(values) => {
            createMutation.mutate(values);
          }}
          SubmitButton={SubmitButton}
          pageSlug={pageSlug}
        />
      </DialogContent>
    </Dialog>
  );
};
