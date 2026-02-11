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
import type { TRPCClientErrorLike } from "@trpc/client";
import type { AppRouter } from "@calcom/trpc/server/routers/_app";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import type { ControllerRenderProps } from "react-hook-form";
import type { ReactNode } from "react";

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

interface LocationTypeOption {
  value: GoogleWorkingLocationType;
  labelKey: string;
  descriptionKey: string;
}

interface CredentialOption {
  value: number;
  label: string;
}

interface MutationSuccessData {
  schedule: { id: number; name: string };
}

const locationTypeOptions: LocationTypeOption[] = [
  {
    value: "homeOffice",
    labelKey: "google_working_location_home_remote",
    descriptionKey: "google_working_location_home_remote_description",
  },
  {
    value: "officeLocation",
    labelKey: "google_working_location_office",
    descriptionKey: "google_working_location_office_description",
  },
  {
    value: "customLocation",
    labelKey: "google_working_location_other",
    descriptionKey: "google_working_location_other_description",
  },
];

export function GoogleWorkingLocationSyncModal({ isOpen, onClose }: GoogleWorkingLocationSyncModalProps): ReactNode {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();

  // Fetch Google Calendar credentials
  const { data: credentialsData, isLoading: isLoadingCredentials } = trpc.viewer.apps.appCredentialsByType.useQuery(
    { appType: "google_calendar" },
    { enabled: isOpen }
  );

  const form = useForm<FormValues>({
    defaultValues: {
      name: "",
      credentialId: null,
      locationTypes: ["officeLocation"],
    },
  });

  const handleMutationSuccess = async ({ schedule }: MutationSuccessData): Promise<void> => {
    await utils.viewer.availability.list.invalidate();
    showToast(t("schedule_created_successfully", { scheduleName: schedule.name }), "success");
    router.push(`/availability/${schedule.id}`);
    onClose();
  };

  const handleMutationError = (error: TRPCClientErrorLike<AppRouter>): void => {
    showToast(error.message || t("something_went_wrong"), "error");
  };

  const createMutation = trpc.viewer.availability.schedule.createFromGoogleWorkingLocation.useMutation({
    onSuccess: handleMutationSuccess,
    onError: handleMutationError,
  });

  const googleCalendarCredentials = credentialsData?.credentials?.filter((c) => c.type === "google_calendar") ?? [];
  const hasGoogleCalendar = googleCalendarCredentials.length > 0;

  const credentialOptions: CredentialOption[] = googleCalendarCredentials.map((cred) => ({
    value: cred.id,
    label: cred.appId || "Google Calendar",
  }));

  // Auto-select credential if only one exists
  const selectedCredentialId = form.watch("credentialId");
  if (!selectedCredentialId && credentialOptions.length === 1) {
    form.setValue("credentialId", credentialOptions[0].value);
  }

  const onSubmit = (values: FormValues): void => {
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

  const handleOpenChange = (open: boolean): void => {
    if (!open) {
      onClose();
    }
  };

  const renderCredentialSelect = (
    field: ControllerRenderProps<FormValues, "credentialId">
  ): ReactNode => {
    return (
      <Select
        options={credentialOptions}
        value={credentialOptions.find((opt: CredentialOption) => opt.value === field.value) || null}
        onChange={(option: CredentialOption | null): void => field.onChange(option?.value ?? null)}
        placeholder={t("select_calendar")}
      />
    );
  };

  const renderLocationTypeCheckbox = (
    field: ControllerRenderProps<FormValues, "locationTypes">,
    option: LocationTypeOption
  ): ReactNode => {
    return (
      <label className="border-subtle hover:bg-muted flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors">
        <Checkbox
          checked={field.value.includes(option.value)}
          onCheckedChange={(checked) => {
            if (checked === true) {
              field.onChange([...field.value, option.value]);
            } else {
              field.onChange(field.value.filter((v) => v !== option.value));
            }
          }}
        />
        <div>
          <p className="text-default font-medium">{t(option.labelKey)}</p>
          <p className="text-subtle text-sm">{t(option.descriptionKey)}</p>
        </div>
      </label>
    );
  };

  const renderLoadingState = (): ReactNode => {
    return (
      <div className="flex items-center justify-center py-8">
        <Icon name="loader" className="text-subtle h-6 w-6 animate-spin" />
      </div>
    );
  };

  const renderNoGoogleCalendarState = (): ReactNode => {
    return (
      <div className="py-6 text-center">
        <Icon name="calendar" className="text-subtle mx-auto mb-4 h-12 w-12" />
        <p className="text-default mb-4">{t("no_google_calendar_connected")}</p>
        <Button color="secondary" href="/apps/google-calendar" target="_blank" EndIcon="external-link">
          {t("connect_google_calendar")}
        </Button>
      </div>
    );
  };

  const renderFormContent = (): ReactNode => {
    return (
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
                render={({ field }: { field: ControllerRenderProps<FormValues, "credentialId"> }): ReactNode => renderCredentialSelect(field)}
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
                  render={({ field }: { field: ControllerRenderProps<FormValues, "locationTypes"> }): ReactNode => renderLocationTypeCheckbox(field, option)}
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
    );
  };

  const renderDialogBody = (): ReactNode => {
    if (isLoadingCredentials) {
      return renderLoadingState();
    }
    if (!hasGoogleCalendar) {
      return renderNoGoogleCalendarState();
    }
    return renderFormContent();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="calendar" className="h-5 w-5" />
            {t("sync_with_google_working_location")}
          </DialogTitle>
        </DialogHeader>
        {renderDialogBody()}
      </DialogContent>
    </Dialog>
  );
}
