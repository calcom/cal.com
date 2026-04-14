"use client";

import { useMemo } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";

import type { NewAccessScope } from "@calcom/features/oauth/constants";
import { OAUTH_SCOPE_CATEGORIES } from "@calcom/features/oauth/constants";
import { MAX_REDIRECT_URIS, validateRedirectUri } from "@calcom/features/oauth/utils/validateRedirectUris";
import { useLocale } from "@calcom/i18n/useLocale";
import type { AccessScope } from "@calcom/prisma/enums";
import { ImageUploader } from "@calcom/ui/components/image-uploader";

import {
  Alert,
  AlertDescription,
} from "@coss/ui/components/alert";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@coss/ui/components/avatar";
import { Button } from "@coss/ui/components/button";
import { Checkbox } from "@coss/ui/components/checkbox";
import { CheckboxGroup } from "@coss/ui/components/checkbox-group";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@coss/ui/components/collapsible";
import {
  Field,
  FieldError,
  FieldItem,
  FieldLabel,
} from "@coss/ui/components/field";
import { Fieldset, FieldsetLegend } from "@coss/ui/components/fieldset";
import { Input } from "@coss/ui/components/input";
import { Label } from "@coss/ui/components/label";
import { Switch } from "@coss/ui/components/switch";
import {
  Tooltip,
  TooltipProvider,
  TooltipPopup,
  TooltipTrigger,
} from "@coss/ui/components/tooltip";
import { Textarea } from "@coss/ui/components/textarea";
import {
  ChevronRightIcon,
  InfoIcon,
  KeyIcon,
  PlusIcon,
  TrashIcon,
  TriangleAlertIcon,
} from "@coss/ui/icons";

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

  const websiteUrlValidation = useMemo(
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

  const logo = form.watch("logo");

  return (
    <>
      <Controller
        name="name"
        control={form.control}
        rules={{ required: t("field_required") }}
        render={({
          field: { ref, name, value, onBlur, onChange },
          fieldState: { invalid, error },
        }) => {
          return (
            <Field name={name} invalid={invalid}>
              <FieldLabel>{t("client_name")}</FieldLabel>
              <Input
                id={name}
                ref={ref}
                disabled={isFormDisabled}
                placeholder={t("client_name_placeholder")}
                type="text"
                value={value}
                onBlur={onBlur}
                onChange={(e) => onChange(e.target.value)}
              />
              <FieldError data-testid={`field-error-${name}`} match={!!error}>
                {error?.message ?? t("field_required")}
              </FieldError>
            </Field>
          );
        }}
      />

      <Controller
        name="purpose"
        control={form.control}
        rules={{ required: t("field_required") }}
        render={({
          field: { ref, name, value, onBlur, onChange },
          fieldState: { invalid, error },
        }) => {
          return (
            <Field name={name} invalid={invalid}>
              <FieldLabel>
                {t("purpose")}
                <TooltipProvider delay={0}>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span className="cursor-help">
                          <InfoIcon className="size-3.5 opacity-80" />
                        </span>
                      }
                    />
                    <TooltipPopup className="max-w-64 text-center">{t("purpose_tooltip")}</TooltipPopup>
                  </Tooltip>
                </TooltipProvider>
              </FieldLabel>
              <Textarea
                id={name}
                ref={ref}
                disabled={isFormDisabled}
                placeholder={t("purpose_placeholder")}
                value={value}
                onBlur={onBlur}
                onChange={(e) => onChange(e.target.value)}
              />
              <FieldError data-testid={`field-error-${name}`} match={!!error}>
                {error?.message ?? t("field_required")}
              </FieldError>
            </Field>
          );
        }}
      />

      <RedirectUriFields form={form} disabled={isFormDisabled} />

      <Controller
        name="websiteUrl"
        control={form.control}
        rules={websiteUrlValidation}
        render={({
          field: { ref, name, value, onBlur, onChange },
          fieldState: { invalid, error },
        }) => {
          return (
            <Field name={name} invalid={invalid}>
              <FieldLabel>
                {t("website_url")}
                <TooltipProvider delay={0}>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span className="cursor-help">
                          <InfoIcon className="size-3.5 opacity-80" />
                        </span>
                      }
                    />
                    <TooltipPopup className="max-w-64 text-center">{t("website_url_tooltip")}</TooltipPopup>
                  </Tooltip>
                </TooltipProvider>
              </FieldLabel>
              <Input
                id={name}
                ref={ref}
                disabled={isFormDisabled}
                placeholder={
                  isFormDisabled ? undefined : t("website_url_placeholder")
                }
                type="text"
                value={value}
                onBlur={onBlur}
                onChange={(e) => onChange(e.target.value)}
              />
              <FieldError data-testid={`field-error-${name}`} match={!!error}>
                {error?.message ?? t("invalid_url")}
              </FieldError>
            </Field>
          );
        }}
      />

      <Controller
        name="enablePkce"
        control={form.control}
        render={({ field: { name, value, onBlur, onChange } }) => (
          <Field name={name}>
            <Label className="gap-1" render={<FieldsetLegend />}>
              {t("authentication_mode")}
              <TooltipProvider delay={0}>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <span className="cursor-help">
                        <InfoIcon className="size-3.5 opacity-80" />
                      </span>
                    }
                  />
                  <TooltipPopup className="max-w-72 text-center">{t("pkce_cannot_be_changed_after_creation")}</TooltipPopup>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <FieldLabel className="font-normal">
              <Switch
                checked={value}
                data-testid="oauth-client-pkce-toggle"
                disabled={isFormDisabled || isPkceLocked}
                onBlur={onBlur}
                onCheckedChange={onChange}
              />
              <span className="text-sm">{t("use_pkce")}</span>
            </FieldLabel>
          </Field>
        )}
      />

      <OAuthScopeCheckboxes form={form} disabled={isFormDisabled} isLegacy={isLegacyOAuthClient} />

      <div>
        <Label className="mb-3">{t("logo")}</Label>
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            {logo ? (
              <AvatarImage alt={t("logo")} src={logo} />
            ) : null}
            <AvatarFallback className="bg-black/10 dark:bg-white/12">
              <KeyIcon className="text-muted-foreground size-5" />
            </AvatarFallback>
          </Avatar>
          {allowUploadingLogo ? (
            <ImageUploader
              disabled={isFormDisabled}
              handleAvatarChange={(newLogo: string) => {
                form.setValue("logo", newLogo);
              }}
              id="avatar-upload"
              imageSrc={logo}
              buttonMsg={t("upload_logo")}
              target="avatar"
              testId="oauth-client-logo"
            />
          ) : null}
        </div>
      </div>
    </>
  );
};

function RedirectUriFields({
  form,
  disabled,
}: {
  form: UseFormReturn<OAuthClientCreateFormValues>;
  disabled: boolean;
}) {
  const { t } = useLocale();
  const redirectUris = form.watch("redirectUris");
  const canAddMore = redirectUris.length < MAX_REDIRECT_URIS;

  return (
    <Fieldset className="gap-2 max-w-none">
      <FieldsetLegend className="font-medium text-sm">{t("redirect_uris")}</FieldsetLegend>
      <div className="flex flex-col gap-2">
        {redirectUris.map((_uri, index) => (
          <Controller
            key={index}
            name={`redirectUris.${index}`}
            control={form.control}
            rules={{
              validate: (value: string) => {
                if (!value) return true;
                const uriError = validateRedirectUri(value);
                if (uriError !== true) return uriError;
                const currentUris = form.getValues("redirectUris");
                const isDuplicate = currentUris.some((uri, i) => i !== index && uri === value);
                if (isDuplicate) return t("duplicate_redirect_uri");
                return true;
              },
            }}
            render={({
              field: { ref, name, value, onBlur, onChange },
              fieldState: { invalid, error },
            }) => (
              <div className="flex items-start gap-2">
                <Field name={name} invalid={invalid} className="w-full">
                  <Input
                    id={`redirectUri-${index}`}
                    ref={ref}
                    className="w-full"
                    disabled={disabled}
                    placeholder={t("redirect_uri_placeholder")}
                    type="text"
                    value={value}
                    onBlur={onBlur}
                    onChange={(e) => {
                      onChange(e.target.value);
                      const siblingsWithErrors = redirectUris
                        .map((_, i) => i)
                        .filter((i) => i !== index && form.formState.errors.redirectUris?.[i]);
                      if (siblingsWithErrors.length > 0) {
                        form.trigger(siblingsWithErrors.map((i) => `redirectUris.${i}` as const));
                      }
                    }}
                  />
                  <FieldError data-testid={`field-error-redirectUri-${index}`} match={!!error}>
                    {error?.message}
                  </FieldError>
                </Field>
                {redirectUris.length > 1 && !disabled ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    data-testid={`remove-redirect-uri-${index}`}
                    onClick={() => {
                      const updated = redirectUris.filter((_, i) => i !== index);
                      form.setValue("redirectUris", updated, { shouldValidate: true });
                    }}
                    aria-label={t("remove_redirect_uri")}>
                    <TrashIcon aria-hidden="true" />
                  </Button>
                ) : null}
              </div>
            )}
          />
        ))}
        {!disabled ? (
          <Button
            className="w-fit min-w-0"
            type="button"
            variant="ghost"
            size="sm"
            disabled={!canAddMore}
            onClick={() => form.setValue("redirectUris", [...redirectUris, ""])}>
            <PlusIcon aria-hidden="true" />
            {canAddMore ? t("add_redirect_uri") : t("max_redirect_uris_reached", { max: MAX_REDIRECT_URIS })}
          </Button>
        ) : null}
      </div>
    </Fieldset>
  );
}

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

  return (
    <Controller
      control={form.control}
      name="scopes"
      render={({ field }) => {
        const scopes = field.value || [];

        return (
          <Field className="gap-4" name="scopes">
            <Label className="gap-1" render={<FieldsetLegend />}>
              {t("oauth_scopes")}
              <TooltipProvider delay={0}>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <span className="cursor-help">
                        <InfoIcon className="size-3.5 opacity-80" />
                      </span>
                    }
                  />
                  <TooltipPopup>{t("oauth_scopes_description")}</TooltipPopup>
                </Tooltip>
              </TooltipProvider>
            </Label>
            {isLegacy && (
              <Alert variant="warning">
                <TriangleAlertIcon />
                <AlertDescription>
                  {t("legacy_oauth_client_scopes_warning")}{" "}
                  <a
                    href="https://cal.com/docs/api-reference/v2/oauth#legacy-client-migration"
                    rel="noopener noreferrer"
                    target="_blank"
                    className="underline">
                    https://cal.com/docs/api-reference/v2/oauth#legacy-client-migration
                  </a>
                </AlertDescription>
              </Alert>
            )}
            <div className="border rounded-lg w-full">
              {OAUTH_SCOPE_CATEGORIES.map((category, index) => (
                <ScopeCategorySection
                  key={category.labelKey}
                  categoryScopes={category.scopes}
                  defaultExpanded={index === 0}
                  disabled={disabled}
                  labelKey={category.labelKey}
                  selectedScopes={scopes}
                  value={scopes}
                  onValueChange={field.onChange}
                />
              ))}
            </div>
          </Field>
        );
      }}
    />
  );
}

function ScopeCategorySection({
  labelKey,
  categoryScopes,
  selectedScopes,
  disabled,
  defaultExpanded,
  value,
  onValueChange,
}: {
  labelKey: string;
  categoryScopes: NewAccessScope[];
  selectedScopes: AccessScope[];
  disabled: boolean;
  defaultExpanded: boolean;
  value: AccessScope[];
  onValueChange: (value: AccessScope[]) => void;
}) {
  const { t } = useLocale();

  const selectedCount = categoryScopes.filter((s) => selectedScopes.includes(s)).length;
  const totalCount = categoryScopes.length;

  return (
    <Collapsible
      className="not-last:border-b"
      defaultOpen={defaultExpanded}
    >
      <CollapsibleTrigger
        className="flex w-full items-center justify-between p-3 data-panel-open:[&_svg]:rotate-90"
        data-testid={`oauth-scope-category-${labelKey}`}
      >
        <div className="flex items-center gap-2">
          <ChevronRightIcon className="size-4 transition-transform" aria-hidden="true" />
          <span className="text-sm font-medium">{t(labelKey)}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {selectedCount}/{totalCount}
        </span>
      </CollapsibleTrigger>
      <CollapsiblePanel>
        <CheckboxGroup
          allValues={categoryScopes}
          aria-labelledby={`oauth-scope-category-${labelKey}-caption`}
          className="px-3.5 pt-1 pb-4"
          disabled={disabled}
          onValueChange={(categoryValue) => {
            const otherScopes = value.filter(
              (s) => !(categoryScopes as readonly AccessScope[]).includes(s)
            );
            onValueChange([...otherScopes, ...(categoryValue as AccessScope[])]);
          }}
          value={value.filter((s) =>
            (categoryScopes as readonly AccessScope[]).includes(s)
          )}
        >
          <FieldItem>
            <FieldLabel id={`oauth-scope-category-${labelKey}-caption`}>
              <Checkbox
                data-testid={`oauth-scope-select-all-${labelKey}`}
                disabled={disabled}
                indeterminate={
                  selectedCount > 0 && selectedCount < totalCount
                }
                parent
              />
              {t("select_all")}
            </FieldLabel>
          </FieldItem>
          {categoryScopes.map((scope) => (
            <FieldItem key={scope} className="ms-4">
              <FieldLabel>
                <Checkbox
                  data-testid={`oauth-scope-checkbox-${scope}`}
                  disabled={disabled}
                  value={scope}
                />
                {t(scopeTranslationKey(scope))}
              </FieldLabel>
            </FieldItem>
          ))}
        </CheckboxGroup>
      </CollapsiblePanel>
    </Collapsible>
  );
}
