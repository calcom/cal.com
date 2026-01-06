"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@calcom/ui/components/dialog";
import { Checkbox, Form, InputField, Label, Select } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

type GoogleWorkingLocationType = "homeOffice" | "officeLocation" | "customLocation";

interface GoogleWorkingLocationSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormValues {
  name: string;
  credentialId: number | null;
  locationTypes: GoogleWorkingLocationType[];
}

const locationTypeOptions: { value: GoogleWorkingLocationType; label: string; description: string }[] = [
  {
    value: "homeOffice",
    label: "Home / Remote",
    description: "Days when you're working from home",
  },
  {
    value: "officeLocation",
    label: "Office",
    description: "Days when you're working from an office",
  },
  {
    value: "customLocation",
    label: "Other Location",
    description: "Days at a custom location",
  },
];

export function GoogleWorkingLocationSyncModal({ isOpen, onClose }: GoogleWorkingLocationSyncModalProps) {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();

  // Fetch Google Calendar credentials
  const { data: credentials, isLoading: isLoadingCredentials } = trpc.viewer.credentials.list.useQuery(
    { type: "google_calendar" },
    { enabled: isOpen }
  );

  const form = useForm<FormValues>({
    defaultValues: {
      name: "",
      credentialId: null,
      locationTypes: ["officeLocation"],
    },
  });

  const createMutation = trpc.viewer.availability.schedule.createFromGoogleWorkingLocation.useMutation({
    onSuccess: async ({ schedule }) => {
      await utils.viewer.availability.list.invalidate();
      showToast(t("schedule_created_successfully", { scheduleName: schedule.name }), "success");
      router.push(`/availability/${schedule.id}`);
      onClose();
    },
    onError: (error) => {
      showToast(error.message || t("something_went_wrong"), "error");
    },
  });

  const googleCalendarCredentials = credentials?.items?.filter((c) => c.type === "google_calendar") ?? [];
  const hasGoogleCalendar = googleCalendarCredentials.length > 0;

  const credentialOptions = googleCalendarCredentials.map((cred) => ({
    value: cred.id,
    label: cred.appId || "Google Calendar",
  }));

  // Auto-select credential if only one exists
  const selectedCredentialId = form.watch("credentialId");
  if (!selectedCredentialId && credentialOptions.length === 1) {
    form.setValue("credentialId", credentialOptions[0].value);
  }

  const onSubmit = (values: FormValues) => {
    if (!values.credentialId) {
      showToast(t("please_select_google_calendar"), "error");
      return;
    }

    if (values.locationTypes.length === 0) {
      showToast(t("please_select_at_least_one_location_type"), "error");
      return;
    }

    createMutation.mutate({
      name: values.name || t("google_working_location_schedule"),
      credentialId: values.credentialId,
      calendarId: "primary",
      locationTypes: values.locationTypes,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="calendar" className="h-5 w-5" />
            {t("sync_with_google_working_location")}
          </DialogTitle>
        </DialogHeader>

        {isLoadingCredentials ? (
          <div className="flex items-center justify-center py-8">
            <Icon name="loader" className="text-subtle h-6 w-6 animate-spin" />
          </div>
        ) : !hasGoogleCalendar ? (
          <div className="py-6 text-center">
            <Icon name="calendar" className="text-subtle mx-auto mb-4 h-12 w-12" />
            <p className="text-default mb-4">{t("no_google_calendar_connected")}</p>
            <Button color="secondary" href="/apps/google-calendar" target="_blank" EndIcon="external-link">
              {t("connect_google_calendar")}
            </Button>
          </div>
        ) : (
          <Form form={form} handleSubmit={onSubmit}>
            <div className="space-y-4">
              <InputField
                label={t("schedule_name")}
                placeholder={t("google_working_location_schedule")}
                {...form.register("name")}
              />

              {credentialOptions.length > 1 && (
                <div>
                  <Label>{t("google_calendar_account")}</Label>
                  <Controller
                    name="credentialId"
                    control={form.control}
                    render={({ field }) => (
                      <Select
                        options={credentialOptions}
                        value={credentialOptions.find((opt) => opt.value === field.value) || null}
                        onChange={(option) => field.onChange(option?.value ?? null)}
                        placeholder={t("select_calendar")}
                      />
                    )}
                  />
                </div>
              )}

              <div>
                <Label className="mb-2">{t("sync_when_working_from")}</Label>
                <p className="text-subtle mb-3 text-sm">{t("select_location_types_to_sync")}</p>
                <div className="space-y-2">
                  {locationTypeOptions.map((option) => (
                    <Controller
                      key={option.value}
                      name="locationTypes"
                      control={form.control}
                      render={({ field }) => (
                        <label className="border-subtle hover:bg-muted flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors">
                          <Checkbox
                            checked={field.value.includes(option.value)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              if (checked) {
                                field.onChange([...field.value, option.value]);
                              } else {
                                field.onChange(field.value.filter((v) => v !== option.value));
                              }
                            }}
                          />
                          <div>
                            <p className="text-default font-medium">{option.label}</p>
                            <p className="text-subtle text-sm">{option.description}</p>
                          </div>
                        </label>
                      )}
                    />
                  ))}
                </div>
              </div>

              <div className="bg-subtle rounded-md p-3">
                <p className="text-subtle text-sm">
                  <Icon name="info" className="mr-1 inline h-4 w-4" />
                  {t("google_working_location_sync_description")}
                </p>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <DialogClose />
              <Button type="submit" loading={createMutation.isPending} disabled={!hasGoogleCalendar}>
                {t("create_schedule")}
              </Button>
            </DialogFooter>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
