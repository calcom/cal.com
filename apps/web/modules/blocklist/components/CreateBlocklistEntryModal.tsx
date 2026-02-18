"use client";

import { useEffect, useMemo } from "react";
import type { CSSObjectWithLabel, GroupBase, SingleValue } from "react-select";
import { Controller, useForm } from "react-hook-form";

import { domainRegex, emailRegex } from "@calcom/lib/emailSchema";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WatchlistType } from "@calcom/prisma/enums";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { Input, Label, Select, TextArea } from "@calcom/ui/components/form";

import type { BlocklistScope, CreateBlocklistEntryFormData } from "@calcom/features/blocklist/types";

type TypeOption = { label: string; value: WatchlistType };

const TYPE_CONFIG: Record<WatchlistType, { labelKey: string; placeholderKey: string }> = {
  [WatchlistType.EMAIL]: { labelKey: "email", placeholderKey: "user@example.com" },
  [WatchlistType.DOMAIN]: { labelKey: "domain", placeholderKey: "spammer.com" },
  [WatchlistType.USERNAME]: { labelKey: "username", placeholderKey: "username" },
  [WatchlistType.SPAM_KEYWORD]: { labelKey: "spam_keyword", placeholderKey: "spam_keyword_placeholder" },
  [WatchlistType.SUSPICIOUS_DOMAIN]: {
    labelKey: "suspicious_domain",
    placeholderKey: "suspicious_domain_placeholder",
  },
  [WatchlistType.EMAIL_PATTERN]: { labelKey: "email_pattern", placeholderKey: "email_pattern_placeholder" },
  [WatchlistType.REDIRECT_DOMAIN]: {
    labelKey: "redirect_domain",
    placeholderKey: "redirect_domain_placeholder",
  },
};

const DOMAIN_VALIDATED_TYPES = new Set<WatchlistType>([
  WatchlistType.DOMAIN,
  WatchlistType.SUSPICIOUS_DOMAIN,
  WatchlistType.REDIRECT_DOMAIN,
]);

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
    } else if (DOMAIN_VALIDATED_TYPES.has(watchType)) {
      const domainToValidate = value.startsWith("*.") ? value.slice(2) : value;
      if (!domainRegex.test(domainToValidate)) {
        return t("invalid_domain_format");
      }
    } else if (watchType === WatchlistType.EMAIL_PATTERN) {
      try {
        new RegExp(value);
      } catch {
        return t("invalid_regex_pattern");
      }
    }

    return true;
  };

  const groupedOptions = useMemo<GroupBase<TypeOption>[]>(() => {
    const groups: GroupBase<TypeOption>[] = [
      {
        label: t("blocking"),
        options: [
          { label: t("email"), value: WatchlistType.EMAIL },
          { label: t("domain"), value: WatchlistType.DOMAIN },
          { label: t("username"), value: WatchlistType.USERNAME },
        ],
      },
      {
        label: t("abuse_scoring"),
        options: [
          { label: t("spam_keyword"), value: WatchlistType.SPAM_KEYWORD },
          { label: t("suspicious_domain"), value: WatchlistType.SUSPICIOUS_DOMAIN },
          { label: t("email_pattern"), value: WatchlistType.EMAIL_PATTERN },
          { label: t("redirect_domain"), value: WatchlistType.REDIRECT_DOMAIN },
        ],
      },
    ];
    return groups;
  }, [t]);

  const selectedOption = useMemo<TypeOption>(() => {
    const config = TYPE_CONFIG[watchType];
    return { label: t(config.labelKey), value: watchType };
  }, [watchType, t]);

  const config = TYPE_CONFIG[watchType];
  const placeholderRaw = config.placeholderKey;
  const placeholder = placeholderRaw.includes("_placeholder") ? t(placeholderRaw) : placeholderRaw;

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
                  <Select<TypeOption, false, GroupBase<TypeOption>>
                    value={selectedOption}
                    onChange={(option: SingleValue<TypeOption>) => {
                      if (option) {
                        field.onChange(option.value);
                        setValue("value", "");
                      }
                    }}
                    options={groupedOptions}
                    isSearchable={false}
                    menuPortalTarget={typeof document === "undefined" ? undefined : document.body}
                    styles={{
                      menuPortal: (base) => ({ ...base, zIndex: 9999, pointerEvents: "auto" }) as CSSObjectWithLabel,
                    }}
                  />
                )}
              />
              {errors.type && <p className="text-destructive mt-1 text-sm">{errors.type.message}</p>}
            </div>

            <div>
              <Label htmlFor="value" className="text-emphasis mb-2 block text-sm font-medium">
                {t(config.labelKey)}
              </Label>
              <Controller
                name="value"
                control={control}
                rules={{
                  required: t("field_required"),
                  validate: validateValue,
                }}
                render={({ field }) => <Input {...field} placeholder={placeholder} />}
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
            <Button
              type="button"
              color="secondary"
              onClick={handleClose}
              disabled={isSubmitting || isPending}>
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
