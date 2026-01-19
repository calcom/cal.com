"use client";

import { useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { RegisterOptions, UseFormReturn } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Avatar } from "@calcom/ui/components/avatar";
import { Label, Switch, TextArea, TextField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { ImageUploader } from "@calcom/ui/components/image-uploader";
import { Tooltip } from "@calcom/ui/components/tooltip";

import type { OAuthClientCreateFormValues } from "../create/OAuthClientCreateModal";

export const OAuthClientFormFields = ({
  form,
  logo,
  setLogo,
  isClientReadOnly,
  isPkceLocked,
}: {
  form: UseFormReturn<OAuthClientCreateFormValues>;
  logo: string;
  setLogo: Dispatch<SetStateAction<string>>;
  isClientReadOnly?: boolean;
  isPkceLocked?: boolean;
}) => {
  const { t } = useLocale();
  const isFormDisabled = Boolean(isClientReadOnly);
  const allowUploadingLogo = !isFormDisabled;

  const redirectUriValidation: RegisterOptions<OAuthClientCreateFormValues, "redirectUri"> = useMemo(
    () => ({
      required: true,
      validate: (value: string) => {
        try {
          new URL(value);
          return true;
        } catch {
          return t("invalid_url");
        }
      },
    }),
    [t]
  );

  const websiteUrlValidation: RegisterOptions<OAuthClientCreateFormValues, "websiteUrl"> = useMemo(
    () => ({
      validate: (value: string) => {
        if (!value) return true;
        try {
          new URL(value);
          return true;
        } catch {
          return t("invalid_url");
        }
      },
    }),
    [t]
  );

  return (
    <>
      <TextField
        {...form.register("name", { required: true })}
        label={t("client_name")}
        type="text"
        id="name"
        placeholder={t("client_name_placeholder")}
        required
        disabled={isFormDisabled}
      />

      <div>
        <Label htmlFor="purpose" className="text-emphasis mb-2 flex items-center gap-1 text-sm font-medium">
          {t("purpose")}
          <Tooltip content={t("purpose_tooltip")}>
            <span>
              <Icon name="info" className="text-subtle h-4 w-4" />
            </span>
          </Tooltip>
        </Label>
        <TextArea
          {...form.register("purpose", { required: true })}
          id="purpose"
          placeholder={t("purpose_placeholder")}
          required
          disabled={isFormDisabled}
        />
      </div>
      <TextField
        {...form.register("redirectUri", redirectUriValidation)}
        label={t("redirect_uri")}
        type="url"
        id="redirectUri"
        placeholder={t("redirect_uri_placeholder")}
        required
        disabled={isFormDisabled}
      />

      <TextField
        {...form.register("websiteUrl", websiteUrlValidation)}
        label={
          <span className="flex items-center gap-1">
            {t("website_url")}
            <Tooltip content={t("website_url_tooltip")}>
              <span>
                <Icon name="info" className="text-subtle h-4 w-4" />
              </span>
            </Tooltip>
          </span>
        }
        type="url"
        id="websiteUrl"
        placeholder={isFormDisabled ? undefined : t("website_url_placeholder")}
        disabled={isFormDisabled}
      />

      <div>
        <Label className="text-emphasis mb-2 block text-sm font-medium">{t("authentication_mode")}</Label>
        <div className="flex items-center space-x-3">
          <Switch
            data-testid="oauth-client-pkce-toggle"
            checked={form.watch("enablePkce")}
            onCheckedChange={(checked) => form.setValue("enablePkce", checked)}
            disabled={isFormDisabled || isPkceLocked}
          />
          <span className="text-default text-sm">{t("use_pkce")}</span>
        </div>
      </div>

      <div>
        <Label className="text-emphasis mb-2 block text-sm font-medium">{t("logo")}</Label>
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <Avatar
              alt={t("logo")}
              fallback={<Icon name="key" className="text-subtle h-6 w-6" />}
              imageSrc={logo}
              size="lg"
            />
            {allowUploadingLogo ? (
              <ImageUploader
                target="avatar"
                id="avatar-upload"
                buttonMsg={t("upload_logo")}
                testId="oauth-client-logo"
                handleAvatarChange={(newLogo: string) => {
                  setLogo(newLogo);
                  form.setValue("logo", newLogo);
                }}
                imageSrc={logo}
                disabled={isFormDisabled}
              />
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
};
