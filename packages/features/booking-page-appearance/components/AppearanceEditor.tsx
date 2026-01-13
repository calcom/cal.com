"use client";

import { useMemo, useState, useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

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
import { ColorPicker, Label, Select } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

import { SUPPORTED_GOOGLE_FONTS, buildGoogleFontsUrl } from "../lib/buildAppearanceCssVars";

type AppearanceFormValues = {
  fontFamily: string;
  headingFontFamily: string;
  borderRadiusBase: string;
  borderRadiusButton: string;
  colorBackground: string;
  colorTextPrimary: string;
  colorButtonText: string;
  colorBrandPrimary: string;
};

function BookingPagePreview({ formValues }: { formValues: AppearanceFormValues }) {
  const { t } = useLocale();

  const previewStyles = useMemo(() => {
    const styles: React.CSSProperties = {};
    if (formValues.colorBackground) {
      styles.backgroundColor = formValues.colorBackground;
    }
    if (formValues.colorTextPrimary) {
      styles.color = formValues.colorTextPrimary;
    }
    return styles;
  }, [formValues.colorBackground, formValues.colorTextPrimary]);

  const buttonStyles = useMemo(() => {
    const styles: React.CSSProperties = {};
    if (formValues.colorBrandPrimary) {
      styles.backgroundColor = formValues.colorBrandPrimary;
    }
    if (formValues.colorButtonText) {
      styles.color = formValues.colorButtonText;
    }
    if (formValues.borderRadiusButton) {
      styles.borderRadius = formValues.borderRadiusButton;
    }
    return styles;
  }, [formValues.colorBrandPrimary, formValues.colorButtonText, formValues.borderRadiusButton]);

  const cardStyles = useMemo(() => {
    const styles: React.CSSProperties = {};
    if (formValues.borderRadiusBase) {
      styles.borderRadius = formValues.borderRadiusBase;
    }
    return styles;
  }, [formValues.borderRadiusBase]);

  const fontStyles = useMemo(() => {
    const styles: React.CSSProperties = {};
    if (formValues.fontFamily) {
      styles.fontFamily = `"${formValues.fontFamily}", sans-serif`;
    }
    return styles;
  }, [formValues.fontFamily]);

  const headingFontStyles = useMemo(() => {
    const styles: React.CSSProperties = {};
    if (formValues.headingFontFamily) {
      styles.fontFamily = `"${formValues.headingFontFamily}", sans-serif`;
    } else if (formValues.fontFamily) {
      styles.fontFamily = `"${formValues.fontFamily}", sans-serif`;
    }
    return styles;
  }, [formValues.headingFontFamily, formValues.fontFamily]);

  const googleFontsUrl = useMemo(() => {
    const appearance: BookingPageAppearance = {
      fontFamily: formValues.fontFamily || undefined,
      headingFontFamily: formValues.headingFontFamily || undefined,
    };
    return buildGoogleFontsUrl(appearance);
  }, [formValues.fontFamily, formValues.headingFontFamily]);

  return (
    <div
      className="border-subtle flex h-full flex-col overflow-hidden rounded-lg border"
      style={{ ...previewStyles, ...fontStyles }}>
      {googleFontsUrl && <link rel="stylesheet" href={googleFontsUrl} />}
      <div className="bg-muted/50 border-subtle border-b px-4 py-2">
        <span className="text-subtle text-xs font-medium">{t("preview")}</span>
      </div>
      <div className="flex flex-1 items-center justify-center p-4">
        <div
          className="border-subtle w-full max-w-[280px] border bg-white p-4 shadow-sm"
          style={cardStyles}>
          <div className="mb-4 flex items-center gap-3">
            <div className="bg-subtle h-10 w-10 rounded-full" />
            <div>
              <p className="text-sm font-semibold" style={headingFontStyles}>
                John Doe
              </p>
              <p className="text-subtle text-xs">30 Min Meeting</p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-subtle mb-2 text-xs font-medium" style={headingFontStyles}>
              {t("select_date")}
            </p>
            <div className="grid grid-cols-7 gap-1">
              {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                <div key={i} className="text-subtle text-center text-[10px]">
                  {day}
                </div>
              ))}
              {Array.from({ length: 14 }, (_, i) => (
                <div
                  key={i}
                  className={`text-center text-[10px] p-1 ${i === 5 ? "text-white" : "text-default"}`}
                  style={
                    i === 5
                      ? { backgroundColor: formValues.colorBrandPrimary || "#111827", borderRadius: "4px" }
                      : {}
                  }>
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-subtle text-xs font-medium" style={headingFontStyles}>
              {t("select_time")}
            </p>
            {["9:00am", "10:00am", "11:00am"].map((time) => (
              <button
                key={time}
                type="button"
                className="border-subtle text-default w-full border py-2 text-center text-xs transition-colors hover:border-gray-400"
                style={cardStyles}>
                {time}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="mt-4 w-full py-2 text-center text-xs font-medium text-white"
            style={{
              backgroundColor: formValues.colorBrandPrimary || "#111827",
              ...buttonStyles,
            }}>
            {t("confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

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
      colorBrandPrimary: appearanceData?.brandColor ?? "",
    },
  });

  useEffect(() => {
    if (appearanceData && isOpen) {
      const appearance = isOrganization
        ? (appearanceData.orgAppearance as BookingPageAppearance | null)
        : (appearanceData.userAppearance as BookingPageAppearance | null);
      form.reset({
        fontFamily: appearance?.fontFamily ?? "",
        headingFontFamily: appearance?.headingFontFamily ?? "",
        borderRadiusBase: appearance?.borderRadius?.base ?? "",
        borderRadiusButton: appearance?.borderRadius?.button ?? "",
        colorBackground: appearance?.colors?.background ?? "",
        colorTextPrimary: appearance?.colors?.textPrimary ?? "",
        colorButtonText: appearance?.colors?.buttonText ?? "",
        colorBrandPrimary: appearanceData.brandColor ?? "",
      });
    }
  }, [appearanceData, isOpen, isOrganization, form]);

  const watchedValues = useWatch({ control: form.control });

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
      colorBrandPrimary: "",
    });
  };

  const formValues: AppearanceFormValues = {
    fontFamily: watchedValues.fontFamily ?? "",
    headingFontFamily: watchedValues.headingFontFamily ?? "",
    borderRadiusBase: watchedValues.borderRadiusBase ?? "",
    borderRadiusButton: watchedValues.borderRadiusButton ?? "",
    colorBackground: watchedValues.colorBackground ?? "",
    colorTextPrimary: watchedValues.colorTextPrimary ?? "",
    colorButtonText: watchedValues.colorButtonText ?? "",
    colorBrandPrimary: watchedValues.colorBrandPrimary ?? "",
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
      <DialogContent size="xl" title={t("booking_page_appearance")} className="max-w-4xl">
        <DialogHeader title={t("booking_page_appearance")} subtitle={t("booking_page_appearance_description")} />
        <div className="flex gap-6">
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 space-y-6">
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
                <div className="mt-2 grid grid-cols-2 gap-4">
                  <Controller
                    name="colorBrandPrimary"
                    control={form.control}
                    render={({ field }) => (
                      <div>
                        <Label className="text-subtle text-xs">{t("brand_color")}</Label>
                        <ColorPicker
                          defaultValue={field.value || "#111827"}
                          onChange={(value) => field.onChange(value)}
                        />
                      </div>
                    )}
                  />
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

          <div className="hidden w-[320px] flex-shrink-0 lg:block">
            <BookingPagePreview formValues={formValues} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
