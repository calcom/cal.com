import { IdentityProvider } from "@prisma/client";
import { signOut, useSession } from "next-auth/react";
import { useForm } from "react-hook-form";

import { identityProviderNameMap } from "@calcom/features/auth/lib/identityProviderNameMap";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { userMetadata } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import { Alert, Button, Form, Meta, PasswordField, Select, SettingsToggle, showToast } from "@calcom/ui";

type ChangePasswordSessionFormValues = {
  oldPassword: string;
  newPassword: string;
  sessionTimeout?: number;
  apiError: string;
};

const PasswordView = () => {
  const { data } = useSession();
  const { t } = useLocale();
  const utils = trpc.useContext();
  const { data: user } = trpc.viewer.me.useQuery();
  const metadata = userMetadata.safeParse(user?.metadata);
  const sessionTimeout = metadata.success ? metadata.data?.sessionTimeout : undefined;

  const sessionMutation = trpc.viewer.updateProfile.useMutation({
    onSuccess: () => {
      showToast(t("session_timeout_changed"), "success");
      formMethods.reset(formMethods.getValues());
    },
    onSettled: () => {
      utils.viewer.me.invalidate();
    },
    onMutate: async ({ metadata }) => {
      await utils.viewer.me.cancel();
      const previousValue = utils.viewer.me.getData();
      const previousMetadata = userMetadata.parse(previousValue?.metadata);

      if (previousValue && sessionTimeout) {
        utils.viewer.me.setData(undefined, {
          ...previousValue,
          metadata: { ...previousMetadata, sessionTimeout: sessionTimeout },
        });
      }
      return { previousValue };
    },
    onError: (error, _, context) => {
      if (context?.previousValue) {
        utils.viewer.me.setData(undefined, context.previousValue);
      }
      showToast(`${t("session_timeout_change_error")}, ${error.message}`, "error");
    },
  });
  const passwordMutation = trpc.viewer.auth.changePassword.useMutation({
    onSuccess: () => {
      showToast(t("password_has_been_changed"), "success");
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
      showToast(`${t("error_updating_password")}, ${t(error.message)}`, "error");

      formMethods.setError("apiError", {
        message: t(error.message),
        type: "custom",
      });
    },
  });

  const formMethods = useForm<ChangePasswordSessionFormValues>({
    defaultValues: {
      oldPassword: "",
      newPassword: "",
      sessionTimeout,
    },
  });

  const sessionTimeoutWatch = formMethods.watch("sessionTimeout");

  const handleSubmit = (values: ChangePasswordSessionFormValues) => {
    const { oldPassword, newPassword, sessionTimeout: newSessionTimeout } = values;
    if (oldPassword && newPassword) {
      passwordMutation.mutate({ oldPassword, newPassword });
    }
    if (sessionTimeout !== newSessionTimeout) {
      sessionMutation.mutate({ metadata: { ...metadata, sessionTimeout: newSessionTimeout } });
    }
  };

  const timeoutOptions = [5, 10, 15].map((mins) => ({
    label: t("multiple_duration_mins", { count: mins }),
    value: mins,
  }));

  const isDisabled = formMethods.formState.isSubmitting || !formMethods.formState.isDirty;

  const passwordMinLength = data?.user.role === "USER" ? 7 : 15;
  const isUser = data?.user.role === "USER";

  return (
    <>
      <Meta title={t("password")} description={t("password_description")} />
      {user && user.identityProvider !== IdentityProvider.CAL ? (
        <div>
          <div className="mt-6">
            <h2 className="font-cal text-emphasis text-lg font-medium leading-6">
              {t("account_managed_by_identity_provider", {
                provider: identityProviderNameMap[user.identityProvider],
              })}
            </h2>
          </div>
          <p className="text-subtle mt-1 text-sm">
            {t("account_managed_by_identity_provider_description", {
              provider: identityProviderNameMap[user.identityProvider],
            })}
          </p>
        </div>
      ) : (
        <Form form={formMethods} handleSubmit={handleSubmit}>
          {formMethods.formState.errors.apiError && (
            <div className="pb-6">
              <Alert severity="error" message={formMethods.formState.errors.apiError?.message} />
            </div>
          )}

          <div className="max-w-[38rem] sm:grid sm:grid-cols-2 sm:gap-x-4">
            <div>
              <PasswordField {...formMethods.register("oldPassword")} label={t("old_password")} />
            </div>
            <div>
              <PasswordField
                {...formMethods.register("newPassword", {
                  minLength: {
                    message: t(isUser ? "password_hint_min" : "password_hint_admin_min"),
                    value: passwordMinLength,
                  },
                  pattern: {
                    message: "Should contain a number, uppercase and lowercase letters",
                    value: /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).*$/gm,
                  },
                })}
                label={t("new_password")}
              />
            </div>
          </div>
          <p className="text-default mt-4 max-w-[38rem] text-sm">
            {t("invalid_password_hint", { passwordLength: passwordMinLength })}
          </p>
          <div className="border-subtle mt-8 border-t py-8">
            <SettingsToggle
              title={t("session_timeout")}
              description={t("session_timeout_description")}
              checked={sessionTimeoutWatch !== undefined}
              data-testid="session-check"
              onCheckedChange={(e) => {
                if (!e) {
                  formMethods.setValue("sessionTimeout", undefined, { shouldDirty: true });
                } else {
                  formMethods.setValue("sessionTimeout", 10, { shouldDirty: true });
                }
              }}
            />
            {sessionTimeoutWatch && (
              <div className="mt-4 text-sm">
                <div className="flex items-center">
                  <p className="text-default ltr:mr-2 rtl:ml-2">{t("session_timeout_after")}</p>
                  <Select
                    options={timeoutOptions}
                    defaultValue={
                      sessionTimeout
                        ? timeoutOptions.find((tmo) => tmo.value === sessionTimeout)
                        : timeoutOptions[1]
                    }
                    isSearchable={false}
                    className="block h-[36px] !w-auto min-w-0 flex-none rounded-md text-sm"
                    onChange={(event) => {
                      formMethods.setValue("sessionTimeout", event?.value, { shouldDirty: true });
                    }}
                  />
                </div>
              </div>
            )}
          </div>
          {/* TODO: Why is this Form not submitting? Hacky fix but works */}
          <Button
            color="primary"
            className="mt-8"
            type="submit"
            disabled={isDisabled || passwordMutation.isLoading || sessionMutation.isLoading}>
            {t("update")}
          </Button>
        </Form>
      )}
    </>
  );
};

PasswordView.getLayout = getLayout;

export default PasswordView;
