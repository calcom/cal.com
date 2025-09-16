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
import slugify from "@calcom/lib/slugify";
import { SchedulingType } from "@calcom/prisma/enums";

import type { CreateTeamEventModalProps } from "../types/event-types";

export const CreateTeamEventModal: React.FC<CreateTeamEventModalProps> = ({
  open,
  onClose,
  teamId,
  teamName,
  teamSlug,
  isTeamAdminOrOwner: _isTeamAdminOrOwner = true,
}) => {
  const onSuccessMutation = () => {
    onClose();
    triggerToast("Team event created successfully", "success");
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
          <DialogTitle className="text-lg">Add a new team event type</DialogTitle>
          <DialogDescription className="text-sm">
            Create a new event type for people to book times with.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
          {/* Hidden calIdTeamId field */}
          <input type="hidden" {...register("calIdTeamId", { valueAsNumber: true })} value={teamId} />

          {/* Title Field */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Title
            </Label>
            <Input
              id="title"
              placeholder="Quick Chat"
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
              URL
            </Label>
            <div className="flex">
              <Tooltip content={!isManagedEventType ? `${teamSlug || teamName.toLowerCase()}` : "username"}>
                <span className="inline-flex max-w-32 items-center overflow-hidden rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 pr-8 text-xs text-gray-500">
                  /{!isManagedEventType ? `${teamSlug || teamName.toLowerCase()}` : "username"}/
                </span>
              </Tooltip>
              <Input
                id="slug"
                {...register("slug", { required: "URL is required" })}
                onChange={handleSlugChange}
                className={`rounded-l-none ${formState.errors.slug ? "border-red-500" : ""}`}
                placeholder="quick-chat"
              />
            </div>
            {formState.errors.slug && <p className="text-xs text-red-500">{formState.errors.slug.message}</p>}
            {isManagedEventType && (
              <p className="text-xs text-gray-600">Managed event URLs will be distributed to team members</p>
            )}
          </div>

          {/* Assignment/Scheduling Type */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Assignment</Label>
            {formState.errors.schedulingType && (
              <p className="text-xs text-red-500">{formState.errors.schedulingType.message}</p>
            )}

            <RadioGroup
              value={watchedSchedulingType || SchedulingType.COLLECTIVE}
              onValueChange={handleSchedulingTypeChange}
              className="space-y-3">
              <div className="flex items-start space-x-3 rounded-md border p-3 transition-colors hover:bg-gray-50">
                <RadioGroupItem value={SchedulingType.COLLECTIVE} id="collective" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="collective" className="cursor-pointer text-sm font-medium">
                    Collective
                  </Label>
                  <p className="mt-1 text-xs text-gray-600">
                    Schedule meetings when all selected team members are available.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 rounded-md border p-3 transition-colors hover:bg-gray-50">
                <RadioGroupItem value={SchedulingType.ROUND_ROBIN} id="round-robin" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="round-robin" className="cursor-pointer text-sm font-medium">
                    Round Robin
                  </Label>
                  <p className="mt-1 text-xs text-gray-600">Cycle meetings between multiple team members.</p>
                </div>
              </div>

              {/* {isTeamAdminOrOwner && (
                <div className="flex items-start space-x-3 rounded-md border p-3 transition-colors hover:bg-gray-50">
                  <RadioGroupItem value={SchedulingType.MANAGED} id="managed" className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor="managed" className="cursor-pointer text-sm font-medium">
                      Managed Event
                    </Label>
                    <p className="mt-1 text-xs text-gray-600">
                      Create & distribute event types in bulk to team members
                    </p>
                  </div>
                </div>
              )} */}
            </RadioGroup>
          </div>

          <DialogFooter className="flex justify-end space-x-2 pt-4">
            <DialogClose asChild>
              <Button type="button" color="secondary" size="sm" disabled={createMutation.isPending}>
                Close
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
