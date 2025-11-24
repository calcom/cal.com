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
import { Input } from "@calid/features/ui/components/input/input";
import { Label } from "@calid/features/ui/components/label";
import { RadioGroup, RadioGroupItem } from "@calid/features/ui/components/radio-group";
import { triggerToast } from "@calid/features/ui/components/toast";
import { Tooltip } from "@calid/features/ui/components/tooltip";
import React from "react";

import {
  useCalIdCreateEventType,
  type CreateEventTypeFormValues,
} from "@calcom/lib/hooks/useCreateEventType";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import { SchedulingType } from "@calcom/prisma/enums";

import type { CreateTeamEventModalProps } from "../types/event-types";

export const CreateTeamEventModal: React.FC<CreateTeamEventModalProps> = ({
  open,
  onClose,
  teamId,
  teamName,
  teamSlug,
  isTeamAdminOrOwner,
}) => {
  const { t } = useLocale();
  const onSuccessMutation = () => {
    onClose();
    triggerToast(
      t("event_type_created_successfully", { eventTypeTitle: form.getValues("title") }),
      "success"
    );
  };

  const onErrorMutation = (err: string) => {
    triggerToast(err, "error");
  };

  const { form, createMutation, isManagedEventType } = useCalIdCreateEventType(
    onSuccessMutation,
    onErrorMutation
  );

  const { register, setValue, formState, watch, handleSubmit } = form;

  // Set default scheduling type for team events
  React.useEffect(() => {
    setValue("schedulingType", SchedulingType.COLLECTIVE);
  }, [setValue]);

  // Watch form values for real-time updates
  const watchedSchedulingType = watch("schedulingType");

  const handleFormSubmit = (values: CreateEventTypeFormValues) => {
    // Ensure schedulingType is set for team events
    const formData = {
      ...values,
      schedulingType: values.schedulingType || SchedulingType.COLLECTIVE,
    };
    createMutation.mutate(formData);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setValue("title", title);

    // Auto-generate slug if it hasn't been manually touched
    if (formState.touchedFields["slug"] === undefined) {
      setValue("slug", slugify(title));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue("slug", slugify(e.target.value), { shouldTouch: true });
  };

  const handleSchedulingTypeChange = (value: string) => {
    setValue("schedulingType", value as SchedulingType);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">{t("create_new_team_event_type")}</DialogTitle>
          <DialogDescription className="text-sm">
            {t("create_new_team_event_type_description")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
          {/* Hidden calIdTeamId field */}
          <input type="hidden" {...register("calIdTeamId", { valueAsNumber: true })} value={teamId} />

          {/* Title Field */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              {t("title")}
            </Label>
            <Input
              id="title"
              placeholder={t("quick_chat")}
              {...register("title", { required: "Title is required" })}
              onChange={handleTitleChange}
              className={formState.errors.title ? "border-red-500" : ""}
            />
            {formState.errors.title && (
              <p className="text-xs text-red-500">{formState.errors.title.message}</p>
            )}
          </div>

          {/* URL/Slug Field */}
          <div className="space-y-2">
            <Label htmlFor="slug" className="text-sm font-medium">
              {t("url")}
            </Label>
            <div className="flex">
              <Tooltip
                content={!isManagedEventType ? `${teamSlug || teamName.toLowerCase()}` : t("username")}>
                <span className="text-emphasis bg-emphasis inline-flex max-w-32 items-center overflow-hidden rounded-l-md border  border-r-0 border-gray-300 px-3 pr-8 text-xs">
                  /{!isManagedEventType ? `${teamSlug || teamName.toLowerCase()}` : t("username")}/
                </span>
              </Tooltip>
              <Input
                id="slug"
                {...register("slug", { required: "URL is required" })}
                onChange={handleSlugChange}
                className={`rounded-l-none ${formState.errors.slug ? "border-red-500" : ""}`}
                placeholder={t("quick_chat")}
              />
            </div>
            {formState.errors.slug && <p className="text-xs text-red-500">{formState.errors.slug.message}</p>}
            {isManagedEventType && <p className="text-default text-xs">{t("managed_event_about")}</p>}
          </div>

          {/* Assignment/Scheduling Type */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t("assignment")}</Label>
            {formState.errors.schedulingType && (
              <p className="text-xs text-red-500">{formState.errors.schedulingType.message}</p>
            )}

            <RadioGroup
              value={watchedSchedulingType || SchedulingType.COLLECTIVE}
              onValueChange={handleSchedulingTypeChange}
              className="space-y-3">
              <div className="hover:bg-emphasis flex items-start space-x-3 rounded-md border p-3 transition-colors">
                <RadioGroupItem value={SchedulingType.COLLECTIVE} id="collective" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="collective" className="cursor-pointer text-sm font-medium">
                    {t("collective")}
                  </Label>
                  <p className="text-default mt-1 text-xs">{t("collective_description")}</p>
                </div>
              </div>

              <div className="hover:bg-emphasis flex items-start space-x-3 rounded-md border p-3 transition-colors">
                <RadioGroupItem value={SchedulingType.ROUND_ROBIN} id="round-robin" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="round-robin" className="cursor-pointer text-sm font-medium">
                    {t("round_robin")}
                  </Label>
                  <p className="text-default mt-1 text-xs">{t("round_robin_description")}</p>
                </div>
              </div>

              {isTeamAdminOrOwner && (
                <div className="hover:bg-emphasis flex items-start space-x-3 rounded-md border p-3 transition-colors">
                  <RadioGroupItem value={SchedulingType.MANAGED} id="managed" className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor="managed" className="cursor-pointer text-sm font-medium">
                      {t("managed_event")}
                    </Label>
                    <p className="text-default mt-1 text-xs">{t("managed_event_description")}</p>
                  </div>
                </div>
              )}
            </RadioGroup>
          </div>

          <DialogFooter className="flex justify-end space-x-2 pt-4">
            <DialogClose />
            <Button type="submit" size="sm" disabled={createMutation.isPending}>
              {t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
