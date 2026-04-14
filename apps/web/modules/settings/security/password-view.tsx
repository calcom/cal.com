"use client";

import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { Controller, type Control, useForm } from "react-hook-form";
import { CircleAlertIcon } from "@coss/ui/icons";

import { Alert, AlertDescription, AlertTitle } from "@coss/ui/components/alert";
import {
  Card,
  CardDescription,
  CardFrame,
  CardFrameAction,
  CardFrameDescription,
  CardFrameFooter,
  CardFrameHeader,
  CardFrameTitle,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@coss/ui/components/card";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@coss/ui/components/collapsible";
import { Field, FieldError, FieldLabel } from "@coss/ui/components/field";
import { Form } from "@coss/ui/components/form";
import { Skeleton } from "@coss/ui/components/skeleton";
import { Switch } from "@coss/ui/components/switch";
import { PasswordField } from "@coss/ui/shared/password-field";
import { useLocale } from "@calcom/i18n/useLocale";
import { IdentityProvider } from "@calcom/prisma/enums";
import { userMetadata as userMetadataSchema } from "@calcom/prisma/zod-utils";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@coss/ui/components/button";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@coss/ui/components/select";
import { FieldGrid, FieldGridRow } from "@coss/ui/shared/field-grid";
import { toastManager } from "@coss/ui/components/toast";

type ChangePasswordSessionFormValues = {
  oldPassword: string;
  newPassword: string;
  apiError: string;
};

interface PasswordViewProps {
  user: RouterOutputs["viewer"]["me"]["get"];
}

const SkeletonLoader = () => {
  const { t } = useLocale();

  return (
    <div className="flex flex-col gap-4">
      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle>{t("change_password")}</CardFrameTitle>
          <CardFrameDescription>{t("change_password_description")}</CardFrameDescription>
        </CardFrameHeader>
        <Card>
          <CardPanel className="flex flex-col gap-6">
            <FieldGrid className="gap-x-6 gap-y-4">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 sm:h-8 w-full rounded-lg" />
              </div>
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 sm:h-8 w-full rounded-lg" />
              </div>
              <FieldGridRow>
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-24" />
                </div>
              </FieldGridRow>
            </FieldGrid>
          </CardPanel>
        </Card>
        <CardFrameFooter className="flex justify-end">
          <Skeleton className="h-9 sm:h-8 w-18 rounded-lg" />
        </CardFrameFooter>
      </CardFrame>

      <Card>
        <CardPanel>
          <div className="flex items-center justify-between gap-4">
            <CardFrameHeader className="p-0">
              <CardFrameTitle>{t("session_timeout")}</CardFrameTitle>
              <CardFrameDescription>{t("session_timeout_description")}</CardFrameDescription>
            </CardFrameHeader>
            <Skeleton className="h-5.5 w-9.5 sm:h-4.5 sm:w-7.5 rounded-full shrink-0" />
          </div>
        </CardPanel>
      </Card>
    </div>
  );
};

function PasswordFormFields({
  control,
  isUser,
  passwordMinLength,
}: {
  control: Control<ChangePasswordSessionFormValues>;
  isUser: boolean;
  passwordMinLength: number;
}) {
  const { t } = useLocale();

  return (
    <FieldGrid className="gap-x-6 gap-y-4">
      <Controller
        name="oldPassword"
        control={control}
        rules={{ required: t("error_required_field") }}
        render={({
          field: { ref, name, value, onBlur, onChange },
          fieldState: { invalid, isTouched, isDirty, error },
        }) => (
          <Field name={name} invalid={invalid} touched={isTouched} dirty={isDirty}>
            <FieldLabel>{t("old_password")}</FieldLabel>
            <PasswordField
              ref={ref}
              autoComplete="current-password"
              name={name}
              value={value ?? ""}
              onBlur={onBlur}
              onValueChange={onChange}
            />
            <FieldError match={!!error}>{error?.message}</FieldError>
          </Field>
        )}
      />
      <Controller
        name="newPassword"
        control={control}
        rules={{
          required: t("error_required_field"),
          minLength: {
            message: t(isUser ? "password_hint_min" : "password_hint_admin_min"),
            value: passwordMinLength,
          },
          pattern: {
            message: t("password_complexity_hint"),
            value: /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).*$/,
          },
        }}
        render={({
          field: { ref, name, value, onBlur, onChange },
          fieldState: { invalid, isTouched, isDirty, error },
        }) => (
          <Field name={name} invalid={invalid} touched={isTouched} dirty={isDirty}>
            <FieldLabel>{t("new_password")}</FieldLabel>
            <PasswordField
              ref={ref}
              autoComplete="new-password"
              name={name}
              value={value ?? ""}
              onBlur={onBlur}
              onValueChange={onChange}
            />
            <FieldError match={!!error}>{error?.message}</FieldError>
          </Field>
        )}
      />
      <FieldGridRow className="text-muted-foreground text-xs">
        {t("invalid_password_hint", { passwordLength: passwordMinLength })}
      </FieldGridRow>
    </FieldGrid>
  );
}

const PasswordView = ({ user }: PasswordViewProps) => {
  const defaultSessionTimeout = 10;
  const { data } = useSession();
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const metadata = userMetadataSchema.safeParse(user?.metadata);
  const parsedMetadata = metadata.success ? metadata.data : undefined;
  const initialSessionTimeout = metadata.success ? metadata.data?.sessionTimeout : undefined;

  const [sessionTimeout, setSessionTimeout] = useState<number | undefined>(initialSessionTimeout);

  const sessionMutation = trpc.viewer.me.updateProfile.useMutation({
    onSuccess: (data) => {
      toastManager.add({ title: t("session_timeout_changed"), type: "success" });
      formMethods.reset(formMethods.getValues());
      setSessionTimeout(data.metadata?.sessionTimeout);
    },
    onSettled: () => {
      utils.viewer.me.invalidate();
    },
    onMutate: async () => {
      await utils.viewer.me.get.cancel();
      const previousValue = await utils.viewer.me.get.getData();
      const previousMetadata = userMetadataSchema.safeParse(previousValue?.metadata);

      if (previousValue && sessionTimeout && previousMetadata.success) {
        utils.viewer.me.get.setData(undefined, {
          ...previousValue,
          metadata: { ...previousMetadata?.data, sessionTimeout: sessionTimeout },
        });
        return { previousValue };
      }
    },
    onError: (error, _, context) => {
      if (context?.previousValue) {
        utils.viewer.me.get.setData(undefined, context.previousValue);
      }
      toastManager.add({
        title: `${t("session_timeout_change_error")}, ${error.message}`,
        type: "error",
      });
    },
  });
  const passwordMutation = trpc.viewer.auth.changePassword.useMutation({
    onSuccess: () => {
      toastManager.add({ title: t("password_has_been_changed"), type: "success" });
      formMethods.resetField("oldPassword");
      formMethods.resetField("newPassword");

      if (data?.user.role === "INACTIVE_ADMIN") {
        /*
      AdminPasswordBanner component relies on the role returned from the session.
      Next-Auth doesn't provide a way to revalidate the session cookie,
      so this a workaround to hide the banner after updating the password.
      discussion: https://github.com/nextauthjs/next-auth/discussions/4229
      */
        signOut({ callbackUrl: "/auth/login" });
      }
    },
    onError: (error) => {
      formMethods.setError("apiError", {
        message: t(error.message),
        type: "custom",
      });
    },
  });

  const createAccountPasswordMutation = trpc.viewer.auth.createAccountPassword.useMutation({
    onSuccess: () => {
      toastManager.add({
        title: t("password_reset_email", { email: user.email }),
        type: "success",
      });
    },
    onError: (error) => {
      toastManager.add({
        title: `${t("error_creating_account_password")}, ${t(error.message)}`,
        type: "error",
      });
    },
  });

  const formMethods = useForm<ChangePasswordSessionFormValues>({
    defaultValues: {
      oldPassword: "",
      newPassword: "",
    },
  });

  const handleSubmit = (values: ChangePasswordSessionFormValues) => {
    const { oldPassword, newPassword } = values;
    passwordMutation.mutate({ oldPassword, newPassword });
  };

  const handleSessionTimeoutSubmit = () => {
    sessionMutation.mutate({
      metadata: { ...(parsedMetadata ?? {}), sessionTimeout },
    });
  };

  const timeoutOptions = [5, 10, 15].map((mins) => ({
    label: t("multiple_duration_mins", { count: mins }),
    value: mins,
  }));
  const defaultTimeoutOption =
    timeoutOptions.find((option) => option.value === defaultSessionTimeout) ?? timeoutOptions[0];
  const selectedTimeoutOption =
    timeoutOptions.find((option) => option.value === sessionTimeout) ?? null;

  const isDisabled = formMethods.formState.isSubmitting || !formMethods.formState.isDirty;

  const passwordMinLength = data?.user.role === "USER" ? 7 : 15;
  const isUser = data?.user.role === "USER";
  const isSessionTimeoutEnabled = sessionTimeout !== undefined;

  const handleSessionTimeoutToggle = (enabled: boolean) => {
    if (!enabled) {
      setSessionTimeout(undefined);
      sessionMutation.mutate({
        metadata: { ...(parsedMetadata ?? {}), sessionTimeout: undefined },
      });
      return;
    }

    setSessionTimeout(defaultSessionTimeout);
  };

  return (
    <>
      {user && user.identityProvider !== IdentityProvider.CAL && !user.passwordAdded ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {t("account_managed_by_identity_provider", {
                provider: IdentityProvider[user.identityProvider],
              })}
            </CardTitle>
            <CardDescription>
              {t("account_managed_by_identity_provider_description", {
                provider: IdentityProvider[user.identityProvider],
              })}
            </CardDescription>
          </CardHeader>
          <CardPanel>
            <Button
              onClick={() => createAccountPasswordMutation.mutate()}
              loading={createAccountPasswordMutation.isPending}>
              {t("create_account_password")}
            </Button>
          </CardPanel>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <Form
            aria-label={t("password")}
            className="contents"
            onSubmit={formMethods.handleSubmit(handleSubmit)}>
            <CardFrame>
              <CardFrameHeader>
                <CardFrameTitle>{t("change_password")}</CardFrameTitle>
                <CardFrameDescription>{t("change_password_description")}</CardFrameDescription>
              </CardFrameHeader>
              <Card>
                <CardPanel className="flex flex-col gap-6">
                  {formMethods.formState.errors.apiError && (
                    <Alert variant="error">
                      <CircleAlertIcon />
                      <AlertTitle>{t("error_updating_password")}</AlertTitle>
                      <AlertDescription>{formMethods.formState.errors.apiError?.message}</AlertDescription>
                    </Alert>
                  )}
                  <PasswordFormFields
                    control={formMethods.control}
                    isUser={isUser}
                    passwordMinLength={passwordMinLength}
                  />
                </CardPanel>
              </Card>

              <CardFrameFooter className="flex justify-end">
                <Button
                  type="submit"
                  onClick={() => formMethods.clearErrors("apiError")}
                  disabled={isDisabled || passwordMutation.isPending || sessionMutation.isPending}>
                  {t("update")}
                </Button>
              </CardFrameFooter>
            </CardFrame>
          </Form>

          <Form aria-label={t("session_timeout")} className="contents">
            <CardFrame
              className="has-[[data-slot=collapsible-trigger][data-unchecked]]:before:bg-card before:transition-all"
              render={
                <Collapsible open={isSessionTimeoutEnabled} onOpenChange={handleSessionTimeoutToggle} />
              }>
              <CardFrameHeader className="has-[[data-slot=collapsible-trigger][data-unchecked]]:p-6 transition-all">
                <CardFrameTitle>{t("session_timeout")}</CardFrameTitle>
                <CardFrameDescription>{t("session_timeout_description")}</CardFrameDescription>
                <CardFrameAction>
                  <CollapsibleTrigger
                    nativeButton={false}
                    render={
                      <Switch
                        checked={isSessionTimeoutEnabled}
                        onCheckedChange={handleSessionTimeoutToggle}
                        data-testid="session-check"
                        disabled={passwordMutation.isPending || sessionMutation.isPending}
                        aria-label={t("session_timeout")}
                      />
                    }
                  />
                </CardFrameAction>
              </CardFrameHeader>

              <Card
                render={
                  <CollapsiblePanel className="data-ending-style:opacity-0 data-starting-style:opacity-0 transition-[height,opacity]" />
                }>
                <CardPanel>
                  <Field>
                    <FieldLabel>{t("session_timeout_after")}</FieldLabel>
                    <Select
                      items={timeoutOptions}
                      value={selectedTimeoutOption}
                      onValueChange={(value) => {
                        setSessionTimeout(value?.value);
                      }}>
                      <SelectTrigger className="w-auto">
                        <SelectValue placeholder={defaultTimeoutOption.label} />
                      </SelectTrigger>
                      <SelectPopup>
                        {timeoutOptions.map((option) => (
                          <SelectItem key={option.value} value={option}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                  </Field>
                </CardPanel>
              </Card>

              <Collapsible open={isSessionTimeoutEnabled}>
                <CollapsiblePanel className="data-ending-style:opacity-0 data-starting-style:opacity-0 transition-[height,opacity]">
                  <CardFrameFooter className="flex justify-end">
                    <Button
                      type="button"
                      onClick={handleSessionTimeoutSubmit}
                      disabled={
                        initialSessionTimeout === sessionTimeout ||
                        passwordMutation.isPending ||
                        sessionMutation.isPending
                      }>
                      {t("update")}
                    </Button>
                  </CardFrameFooter>
                </CollapsiblePanel>
              </Collapsible>
            </CardFrame>
          </Form>
        </div>
      )}
    </>
  );
};

const PasswordViewWrapper = () => {
  const { data: user, isPending } = trpc.viewer.me.get.useQuery({ includePasswordAdded: true });
  if (isPending || !user) return <SkeletonLoader />;

  return <PasswordView user={user} />;
};

export default PasswordViewWrapper;