"use client";

import { Button } from "@calid/features/ui/components/button";
import type { Dispatch, SetStateAction, CSSProperties } from "react";

import type { FormLevelConfig } from "@calcom/features/form-builder/components/builderTypes";
import {
  resolveFormConfig,
  resolveFormFontStyle,
} from "@calcom/features/form-builder/components/builderTypes";

import type { FormResponse, RoutingForm } from "../types/types";
import FormInputFields from "./FormInputFields";

type RoutingFormRendererProps = {
  form: RoutingForm;
  response: FormResponse;
  setResponse: Dispatch<SetStateAction<FormResponse>>;
  disabledFields?: string[];
  submitLabel?: string;
  submitDisabled?: boolean;
  submitLoading?: boolean;
  onSubmit?: () => void;
  hideSubmit?: boolean;
  className?: string;
  showErrors?: boolean;
};

export default function RoutingFormRenderer({
  form,
  response,
  setResponse,
  disabledFields,
  submitLabel,
  submitDisabled,
  submitLoading,
  onSubmit,
  hideSubmit = false,
  className,
  showErrors = false,
}: RoutingFormRendererProps) {
  const settings = (form.settings ?? {}) as { uiConfig?: Partial<FormLevelConfig> };
  const formConfig = resolveFormConfig(settings.uiConfig ?? null, {
    title: form.name ?? "",
    subtitle: form.description ?? "",
  });
  const { header, style, submitButton } = formConfig;
  const background = style.background;

  const backgroundStyle: CSSProperties =
    background.type === "color"
      ? { backgroundColor: background.color || "transparent" }
      : background.type === "image"
      ? {
          backgroundImage: background.imageUrl ? `url(${background.imageUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "left top",
        }
      : {};

  // X = left/right padding, Y = top/bottom padding around the card
  const layoutPaddingX = 24;
  const layoutPaddingY = 48;

  // Track whether a header exists so we can mirror its space at the bottom
  const hasHeader = !!(header.title || header.subtitle);
  // Total header block height = its own top padding + bottom margin (both driven by header.spacingBottom)
  const headerBlockHeight = hasHeader ? header.spacingBottom * 2 : 0;

  const cardStyle: CSSProperties = {
    borderRadius: `${style.borderRadius}px`,
    padding: `${style.padding}px`,
    ...(style.bgColor ? { backgroundColor: style.bgColor } : {}),
  };
  const resolvedFont = resolveFormFontStyle(style.fontLabel);
  const contentStyle: CSSProperties = {
    maxWidth: `${style.formWidth}px`,
    fontFamily: resolvedFont.fontFamily,
    fontStyle: resolvedFont.fontStyle,
    fontWeight: resolvedFont.fontWeight,
  };

  console.log("Content style: ", contentStyle);

  const btnStyle: CSSProperties = {
    borderRadius: `${submitButton.borderRadius}px`,
    ...(submitButton.color ? { backgroundColor: submitButton.color } : {}),
    ...(submitButton.textColor ? { color: submitButton.textColor } : {}),
  };

  const btnAlignClass =
    submitButton.alignment === "right"
      ? "justify-end"
      : submitButton.alignment === "center"
      ? "justify-center"
      : "justify-start";

  return (
    // Outer wrapper: full-bleed background, no padding so image/color covers entire area
    <div
      className={className ? `relative w-full ${className}` : "relative w-full"}
      style={backgroundStyle}
    >
      {/* Image overlay */}
      {background.type === "image" && background.imageUrl && background.overlayOpacity > 0 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundColor: `rgba(0,0,0,${background.overlayOpacity})` }}
        />
      )}

      {/* Image blur */}
      {background.type === "image" && background.imageUrl && background.blur > 0 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backdropFilter: `blur(${background.blur}px)` }}
        />
      )}

      {/*
        Inner container: owns X/Y padding so form is inset from background edges.
        - paddingTop    = layoutPaddingY (space above header or card)
        - paddingBottom = layoutPaddingY + headerBlockHeight
          mirrors the header block so top and bottom visual weight match.
        - No min-h here — background sizes to content, not the viewport.
      */}
      <div
        className="relative flex w-full items-start justify-center"
        style={{
          paddingTop: `${layoutPaddingY}px`,
          paddingBottom: `${layoutPaddingY + headerBlockHeight}px`,
          paddingLeft: `${layoutPaddingX}px`,
          paddingRight: `${layoutPaddingX}px`,
        }}
      >
        <div className="w-full" style={contentStyle}>
          {hasHeader && (
            <div
              style={{
                textAlign: header.alignment,
                paddingTop: `${header.spacingBottom}px`,
                marginBottom: `${header.spacingBottom}px`,
              }}
            >
              {header.title && (
                <h2
                  className="text-xl font-bold text-default mb-1"
                  style={{
                    fontSize: `${header.titleSize}px`,
                    color: header.titleColor || undefined,
                  }}
                >
                  {header.title}
                </h2>
              )}
              {header.subtitle && (
                <p
                  className="text-sm text-muted"
                  style={{
                    fontSize: `${header.subtitleSize}px`,
                    color: header.subtitleColor || undefined,
                  }}
                >
                  {header.subtitle}
                </p>
              )}
            </div>
          )}

          <div className="bg-default border border-default shadow-md" style={cardStyle}>
          <FormInputFields
            form={form}
            response={response}
            setResponse={setResponse}
            disabledFields={disabledFields}
            fieldStyle={style.fieldStyle}
            showErrors={showErrors}
            accentColor={style.accentColor}
            secondaryColor={style.secondaryColor}
          />

            {!hideSubmit && (
              <div className={`flex pt-4 ${btnAlignClass}`}>
                <Button
                  type={onSubmit ? "button" : "submit"}
                  onClick={onSubmit}
                  loading={submitLoading}
                  disabled={submitDisabled}
                  style={btnStyle}
                  className={`${
                    submitButton.width === "full" ? "w-full justify-center" : "px-8"
                  } h-10 text-sm font-medium mx-4`}
                >
                  {submitButton.text || submitLabel || "Submit"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
