"use client";

import { OAUTH_SCOPES } from "@calcom/features/oauth/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { AccessScope } from "@calcom/prisma/enums";
import { Alert } from "@calcom/ui/components/alert";
import { Avatar } from "@calcom/ui/components/avatar";
import { CheckboxField, Label, Switch, TextArea, TextField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { ImageUploader } from "@calcom/ui/components/image-uploader";
import { InfoIcon, KeyIcon } from "@coss/ui/icons";
import { Tooltip } from "@calcom/ui/components/tooltip";
import { useMemo } from "react";
import type { RegisterOptions, UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";
import { scopeTranslationKey } from "../../../auth/oauth2/scopes";
import type { OAuthClientCreateFormValues } from "../create/OAuthClientCreateModal";

export const OAuthClientFormFields = ({
  form,
  isClientReadOnly,
  isPkceLocked,
  isLegacyOAuthClient,
}: {
  form: UseFormReturn<OAuthClientCreateFormValues>;
  isClientReadOnly?: boolean;
  isPkceLocked?: boolean;
  isLegacyOAuthClient?: boolean;
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
              <InfoIcon className="text-subtle h-4 w-4" />
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
                <InfoIcon className="text-subtle h-4 w-4" />
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

      <OAuthScopeCheckboxes form={form} disabled={isFormDisabled} isLegacy={isLegacyOAuthClient} />

      <div>
        <Label className="text-emphasis mb-2 block text-sm font-medium">{t("logo")}</Label>
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <Avatar
              alt={t("logo")}
              fallback={<KeyIcon className="text-subtle h-6 w-6" />}
              imageSrc={form.watch("logo")}
              size="lg"
            />
            {allowUploadingLogo ? (
              <ImageUploader
                target="avatar"
                id="avatar-upload"
                buttonMsg={t("upload_logo")}
                testId="oauth-client-logo"
                handleAvatarChange={(newLogo: string) => {
                  form.setValue("logo", newLogo);
                }}
                imageSrc={form.watch("logo")}
                disabled={isFormDisabled}
              />
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
};

function OAuthScopeCheckboxes({
  form,
  disabled,
  isLegacy,
}: {
  form: UseFormReturn<OAuthClientCreateFormValues>;
  disabled: boolean;
  isLegacy?: boolean;
}) {
  const { t } = useLocale();

  if (isLegacy) {
    return (
      <div>
        <Label className="text-emphasis mb-2 flex items-center gap-1 text-sm font-medium">
          {t("oauth_scopes")}
        </Label>
        <Alert severity="warning" title={t("legacy_oauth_client_scopes_warning")} />
      </div>
    );
  }

  return (
    <Controller
      control={form.control}
      name="scopes"
      render={({ field }) => {
        const scopes = field.value || [];
        return (
          <div>
            <Label className="text-emphasis mb-2 flex items-center gap-1 text-sm font-medium">
              {t("oauth_scopes")}
              <Tooltip content={t("oauth_scopes_description")}>
                <span>
                  <Icon name="info" className="text-subtle h-4 w-4" />
                </span>
              </Tooltip>
            </Label>
            <div className="border-subtle space-y-1 rounded-md border p-3">
              {OAUTH_SCOPES.map((scope) => (
                <CheckboxField
                  key={scope}
                  data-testid={`oauth-scope-checkbox-${scope}`}
                  checked={scopes.includes(scope)}
                  disabled={disabled}
                  description={t(scopeTranslationKey(scope))}
                  onChange={(e) => {
                    const newScopes = e.target.checked
                      ? [...scopes, scope]
                      : scopes.filter((s) => s !== scope);
                    field.onChange(newScopes);
                  }}
                />
              ))}
            </div>
          </div>
        );
      }}
    />
  );
}
