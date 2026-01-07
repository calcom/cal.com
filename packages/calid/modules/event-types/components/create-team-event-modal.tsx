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
import { Form, FormField } from "@calid/features/ui/components/form";
import { TextField } from "@calid/features/ui/components/input/input";
import { Label } from "@calid/features/ui/components/label";
import { RadioGroup, RadioGroupItem } from "@calid/features/ui/components/radio-group";
import { triggerToast } from "@calid/features/ui/components/toast";
import { Tooltip } from "@calid/features/ui/components/tooltip";
import React from "react";

import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";
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
  const isPlatform = useIsPlatform();

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

  React.useEffect(() => {
    form.setValue("schedulingType", SchedulingType.COLLECTIVE);
    form.setValue("calIdTeamId", Number(teamId));
  }, [form, teamId]);

  const handleFormSubmit = (values: CreateEventTypeFormValues) => {
    const formData = {
      ...values,
      schedulingType: values.schedulingType || SchedulingType.COLLECTIVE,
      calIdTeamId: Number(teamId),
    };
    createMutation.mutate(formData);
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

        <Form form={form} {...form} onSubmit={handleFormSubmit} className="space-y-4 py-2">
          <div className="space-y-4">
            <FormField
              name="title"
              control={form.control}
              render={({ field: { value, onChange }, fieldState: { error } }) => (
                <TextField
                  name="title"
                  label={t("title")}
                  required
                  showAsteriskIndicator
                  placeholder={t("quick_chat")}
                  value={value || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const next = e?.target.value;
                    onChange(next);
                    if (form.formState.touchedFields["slug"] === undefined) {
                      form.setValue("slug", slugify(next));
                    }
                  }}
                  error={error ? error.message : undefined}
                />
              )}
            />

            <FormField
              name="slug"
              control={form.control}
              render={({ field: { value, onChange }, fieldState: { error } }) => {
                const displayValue = value ? slugify(value, true) : "";
                const urlPrefix = !isManagedEventType
                  ? `${teamSlug || teamName.toLowerCase()}`
                  : t("username");
                return (
                  <div>
                    <TextField
                      name="slug"
                      label={isPlatform ? "Slug" : t("url")}
                      required
                      showAsteriskIndicator
                      addOnLeading={
                        !isPlatform ? (
                          <Tooltip content={`/${urlPrefix}/`}>
                            <span className="text-muted max-w-24 truncate md:max-w-56">/{urlPrefix}/</span>
                          </Tooltip>
                        ) : undefined
                      }
                      value={displayValue}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const slugifiedValue = slugify(e?.target.value, true);
                        onChange(slugifiedValue);
                        form.setValue("slug", slugifiedValue, { shouldTouch: true });
                      }}
                      error={error ? error.message : undefined}
                    />
                    {isManagedEventType && !isPlatform && (
                      <p className="text-default mt-2 text-sm">{t("managed_event_url_clarification")}</p>
                    )}
                  </div>
                );
              }}
            />

            <div className="space-y-3">
              <FormField
                name="schedulingType"
                control={form.control}
                render={({ field: { value, onChange }, fieldState: { error } }) => {
                  const handleValueChange = (val: string) => {
                    onChange(val as SchedulingType);
                  };
                  return (
                    <div>
                      <Label className="text-sm font-medium">{t("assignment")}</Label>
                      {error && <p className="text-xs text-red-500">{error.message}</p>}
                      <RadioGroup
                        value={value || SchedulingType.COLLECTIVE}
                        onValueChange={handleValueChange}
                        className="mt-2 space-y-3">
                        <label
                          htmlFor="collective"
                          className="border-default hover:border-emphasis flex cursor-pointer items-start space-x-3 rounded-md border p-3 transition-colors">
                          <RadioGroupItem
                            value={SchedulingType.COLLECTIVE}
                            id="collective"
                            className="mt-1.5"
                          />
                          <div className="flex-1">
                            <Label htmlFor="collective" className="cursor-pointer text-sm font-medium">
                              {t("collective")}
                            </Label>
                            <p className="text-default mt-1 text-xs">{t("collective_description")}</p>
                          </div>
                        </label>

                        <label
                          htmlFor="round-robin"
                          className="border-default hover:border-emphasis flex cursor-pointer items-start space-x-3 rounded-md border p-3 transition-colors">
                          <RadioGroupItem
                            value={SchedulingType.ROUND_ROBIN}
                            id="round-robin"
                            className="mt-1.5"
                          />
                          <div className="flex-1">
                            <Label htmlFor="round-robin" className="cursor-pointer text-sm font-medium">
                              {t("round_robin")}
                            </Label>
                            <p className="text-default mt-1 text-xs">{t("round_robin_description")}</p>
                          </div>
                        </label>

                        {isTeamAdminOrOwner && (
                          <label
                            htmlFor="managed"
                            className="border-default hover:border-emphasis flex cursor-pointer items-start space-x-3 rounded-md border p-3 transition-colors">
                            <RadioGroupItem value={SchedulingType.MANAGED} id="managed" className="mt-1.5" />
                            <div className="flex-1">
                              <Label htmlFor="managed" className="cursor-pointer text-sm font-medium">
                                {t("managed_event")}
                              </Label>
                              <p className="text-default mt-1 text-xs">{t("managed_event_description")}</p>
                            </div>
                          </label>
                        )}
                      </RadioGroup>
                    </div>
                  );
                }}
              />
            </div>
          </div>

          <DialogFooter className="flex justify-end space-x-2 pt-4">
            <DialogClose />
            <Button type="submit" disabled={createMutation.isPending}>
              {t("create")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
