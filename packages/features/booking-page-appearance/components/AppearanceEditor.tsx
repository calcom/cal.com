"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { BookingPageAppearance } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "@calcom/ui/components/dialog";
import { ColorPicker, Label, Select, TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

import { SUPPORTED_GOOGLE_FONTS } from "../lib/buildAppearanceCssVars";

type AppearanceFormValues = {
  fontFamily: string;
  headingFontFamily: string;
  borderRadiusBase: string;
  borderRadiusButton: string;
  colorBackground: string;
  colorTextPrimary: string;
  colorButtonText: string;
};

const fontOptions = [
  { value: "", label: "Default (System)" },
  ...SUPPORTED_GOOGLE_FONTS.map((font) => ({ value: font, label: font })),
];

const borderRadiusOptions = [
  { value: "", label: "Default" },
  { value: "0px", label: "None (0px)" },
  { value: "4px", label: "Small (4px)" },
  { value: "8px", label: "Medium (8px)" },
  { value: "12px", label: "Large (12px)" },
  { value: "16px", label: "Extra Large (16px)" },
  { value: "9999px", label: "Full (Pill)" },
];

interface AppearanceEditorProps {
  isOrganization?: boolean;
  onSuccess?: () => void;
}

export function AppearanceEditor({ isOrganization = false, onSuccess }: AppearanceEditorProps) {
  const { t } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data: appearanceData, isLoading } = trpc.viewer.bookingPageAppearance.get.useQuery();

  const updateMutation = trpc.viewer.bookingPageAppearance.update.useMutation({
    onSuccess: () => {
      showToast(t("settings_updated_successfully"), "success");
      utils.viewer.bookingPageAppearance.invalidate();
      setIsOpen(false);
      onSuccess?.();
    },
    onError: (error) => {
      showToast(error.message || t("error_updating_settings"), "error");
    },
  });

  const updateOrgMutation = trpc.viewer.bookingPageAppearance.updateForOrganization.useMutation({
    onSuccess: () => {
      showToast(t("settings_updated_successfully"), "success");
      utils.viewer.bookingPageAppearance.invalidate();
      setIsOpen(false);
      onSuccess?.();
    },
    onError: (error) => {
      showToast(error.message || t("error_updating_settings"), "error");
    },
  });

  const resetMutation = trpc.viewer.bookingPageAppearance.reset.useMutation({
    onSuccess: () => {
      showToast(t("settings_updated_successfully"), "success");
      utils.viewer.bookingPageAppearance.invalidate();
      setIsOpen(false);
    },
    onError: (error) => {
      showToast(error.message || t("error_updating_settings"), "error");
    },
  });

  const currentAppearance = isOrganization
    ? (appearanceData?.orgAppearance as BookingPageAppearance | null)
    : (appearanceData?.userAppearance as BookingPageAppearance | null);

  const form = useForm<AppearanceFormValues>({
    defaultValues: {
      fontFamily: currentAppearance?.fontFamily ?? "",
      headingFontFamily: currentAppearance?.headingFontFamily ?? "",
      borderRadiusBase: currentAppearance?.borderRadius?.base ?? "",
      borderRadiusButton: currentAppearance?.borderRadius?.button ?? "",
      colorBackground: currentAppearance?.colors?.background ?? "",
      colorTextPrimary: currentAppearance?.colors?.textPrimary ?? "",
      colorButtonText: currentAppearance?.colors?.buttonText ?? "",
    },
  });

  const handleSubmit = (values: AppearanceFormValues) => {
    const appearance: BookingPageAppearance = {
      fontFamily: values.fontFamily || undefined,
      headingFontFamily: values.headingFontFamily || undefined,
      borderRadius:
        values.borderRadiusBase || values.borderRadiusButton
          ? {
              base: values.borderRadiusBase || undefined,
              button: values.borderRadiusButton || undefined,
            }
          : undefined,
      colors:
        values.colorBackground || values.colorTextPrimary || values.colorButtonText
          ? {
              background: values.colorBackground || undefined,
              textPrimary: values.colorTextPrimary || undefined,
              buttonText: values.colorButtonText || undefined,
            }
          : undefined,
    };

    if (isOrganization) {
      updateOrgMutation.mutate({ appearance });
    } else {
      updateMutation.mutate({ appearance });
    }
  };

  const handleReset = () => {
    resetMutation.mutate();
    form.reset({
      fontFamily: "",
      headingFontFamily: "",
      borderRadiusBase: "",
      borderRadiusButton: "",
      colorBackground: "",
      colorTextPrimary: "",
      colorButtonText: "",
    });
  };

  if (!appearanceData?.hasAccess) {
    return null;
  }

  const isPending = updateMutation.isPending || updateOrgMutation.isPending || resetMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button color="secondary" StartIcon="paintbrush" disabled={isLoading}>
          {t("customize_booking_page")}
        </Button>
      </DialogTrigger>
      <DialogContent size="lg" title={t("booking_page_appearance")}>
        <DialogHeader title={t("booking_page_appearance")} subtitle={t("booking_page_appearance_description")} />
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label>{t("typography")}</Label>
              <div className="mt-2 grid grid-cols-2 gap-4">
                <Controller
                  name="fontFamily"
                  control={form.control}
                  render={({ field }) => (
                    <div>
                      <Label className="text-subtle text-xs">{t("body_font")}</Label>
                      <Select
                        options={fontOptions}
                        value={fontOptions.find((opt) => opt.value === field.value)}
                        onChange={(option) => field.onChange(option?.value ?? "")}
                      />
                    </div>
                  )}
                />
                <Controller
                  name="headingFontFamily"
                  control={form.control}
                  render={({ field }) => (
                    <div>
                      <Label className="text-subtle text-xs">{t("heading_font")}</Label>
                      <Select
                        options={fontOptions}
                        value={fontOptions.find((opt) => opt.value === field.value)}
                        onChange={(option) => field.onChange(option?.value ?? "")}
                      />
                    </div>
                  )}
                />
              </div>
            </div>

            <div>
              <Label>{t("border_radius")}</Label>
              <div className="mt-2 grid grid-cols-2 gap-4">
                <Controller
                  name="borderRadiusBase"
                  control={form.control}
                  render={({ field }) => (
                    <div>
                      <Label className="text-subtle text-xs">{t("general")}</Label>
                      <Select
                        options={borderRadiusOptions}
                        value={borderRadiusOptions.find((opt) => opt.value === field.value)}
                        onChange={(option) => field.onChange(option?.value ?? "")}
                      />
                    </div>
                  )}
                />
                <Controller
                  name="borderRadiusButton"
                  control={form.control}
                  render={({ field }) => (
                    <div>
                      <Label className="text-subtle text-xs">{t("buttons")}</Label>
                      <Select
                        options={borderRadiusOptions}
                        value={borderRadiusOptions.find((opt) => opt.value === field.value)}
                        onChange={(option) => field.onChange(option?.value ?? "")}
                      />
                    </div>
                  )}
                />
              </div>
            </div>

            <div>
              <Label>{t("colors")}</Label>
              <div className="mt-2 grid grid-cols-3 gap-4">
                <Controller
                  name="colorBackground"
                  control={form.control}
                  render={({ field }) => (
                    <div>
                      <Label className="text-subtle text-xs">{t("background")}</Label>
                      <ColorPicker
                        defaultValue={field.value || "#ffffff"}
                        onChange={(value) => field.onChange(value)}
                      />
                    </div>
                  )}
                />
                <Controller
                  name="colorTextPrimary"
                  control={form.control}
                  render={({ field }) => (
                    <div>
                      <Label className="text-subtle text-xs">{t("text")}</Label>
                      <ColorPicker
                        defaultValue={field.value || "#000000"}
                        onChange={(value) => field.onChange(value)}
                      />
                    </div>
                  )}
                />
                <Controller
                  name="colorButtonText"
                  control={form.control}
                  render={({ field }) => (
                    <div>
                      <Label className="text-subtle text-xs">{t("button_text")}</Label>
                      <ColorPicker
                        defaultValue={field.value || "#ffffff"}
                        onChange={(value) => field.onChange(value)}
                      />
                    </div>
                  )}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" color="minimal" onClick={handleReset} disabled={isPending}>
              {t("reset_to_default")}
            </Button>
            <Button type="submit" loading={isPending}>
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
