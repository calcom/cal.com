"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import { domainRegex, emailRegex } from "@calcom/lib/emailSchema";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WatchlistType } from "@calcom/prisma/enums";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { Input, Label, TextArea, ToggleGroup } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";

import type { BlocklistScope, CreateBlocklistEntryFormData } from "../types";

export interface CreateBlocklistEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  scope: BlocklistScope;
  onCreateEntry: (data: CreateBlocklistEntryFormData) => void;
  isPending: boolean;
}

export function CreateBlocklistEntryModal({
  isOpen,
  onClose,
  scope,
  onCreateEntry,
  isPending,
}: CreateBlocklistEntryModalProps) {
  const { t } = useLocale();
  const isSystem = scope === "system";

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateBlocklistEntryFormData>({
    defaultValues: {
      type: WatchlistType.EMAIL,
      value: "",
      description: "",
    },
  });

  const watchType = watch("type");

  useEffect(() => {
    if (isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const onSubmit = (data: CreateBlocklistEntryFormData) => {
    onCreateEntry(data);
  };

  const handleClose = () => {
    onClose();
    reset();
  };

  const validateValue = (value: string) => {
    if (!value) return t("required");

    if (watchType === WatchlistType.EMAIL) {
      if (!emailRegex.test(value)) {
        return t("invalid_email_address");
      }
    } else if (watchType === WatchlistType.DOMAIN) {
      const domainToValidate = value.startsWith("*.") ? value.slice(2) : value;
      if (!domainRegex.test(domainToValidate)) {
        return t("invalid_domain_format");
      }
    }

    return true;
  };

  const typeOptions = [
    { label: t("email"), value: WatchlistType.EMAIL, iconLeft: <Icon name="mail" className="h-4 w-4" /> },
    { label: t("domain"), value: WatchlistType.DOMAIN, iconLeft: <Icon name="globe" className="h-4 w-4" /> },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent enableOverflow>
        <DialogHeader title={t(isSystem ? "add_to_system_blocklist" : "add_to_blocklist")} />
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            {isSystem && (
              <Alert
                severity="warning"
                title={t("system_wide_blocklist_warning")}
                message={t("system_wide_blocklist_warning_description")}
              />
            )}

            <div>
              <Label htmlFor="type" className="text-emphasis mb-2 block text-sm font-medium">
                {t("what_would_you_like_to_block")}
              </Label>
              <Controller
                name="type"
                control={control}
                rules={{ required: t("field_required") }}
                render={({ field }) => (
                  <ToggleGroup
                    value={field.value}
                    onValueChange={(value) => {
                      if (value) {
                        field.onChange(value);
                        setValue("value", "");
                      }
                    }}
                    options={typeOptions}
                  />
                )}
              />
              {errors.type && <p className="text-destructive mt-1 text-sm">{errors.type.message}</p>}
            </div>

            <div>
              <Label htmlFor="value" className="text-emphasis mb-2 block text-sm font-medium">
                {watchType === WatchlistType.EMAIL ? t("email") : t("domain_name")}{" "}
              </Label>
              <Controller
                name="value"
                control={control}
                rules={{
                  required: t("field_required"),
                  validate: validateValue,
                }}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder={watchType === WatchlistType.EMAIL ? "user@example.com" : "spammer.com"}
                  />
                )}
              />
              {errors.value && <p className="text-destructive mt-1 text-sm">{errors.value.message}</p>}
            </div>

            <div>
              <Label htmlFor="description" className="text-emphasis mb-2 block text-sm font-medium">
                {t("description")} <span className="text-muted font-normal">{t("optional")}</span>
              </Label>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextArea {...field} placeholder={t("reason_for_adding_to_blocklist")} rows={3} />
                )}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" color="secondary" onClick={handleClose} disabled={isSubmitting || isPending}>
              {t("cancel")}
            </Button>
            <Button type="submit" loading={isSubmitting || isPending} disabled={isSubmitting || isPending}>
              {t(isSystem ? "add_to_system_blocklist" : "add_to_blocklist")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
