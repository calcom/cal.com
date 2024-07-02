"use client";

import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { identityProviderNameMap } from "@calcom/features/auth/lib/identityProviderNameMap";
import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { IdentityProvider } from "@calcom/prisma/enums";
import { userMetadata as userMetadataSchema } from "@calcom/prisma/zod-utils";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import {
  Alert,
  Button,
  Form,
  Meta,
  PasswordField,
  Select,
  SettingsToggle,
  showToast,
  SkeletonButton,
  SkeletonContainer,
  SkeletonText,
} from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

type ChangePasswordSessionFormValues = {
  oldPassword: string;
  newPassword: string;
  sessionTimeout?: number;
  apiError: string;
};

interface PasswordViewProps {
  user: RouterOutputs["viewer"]["me"];
}

const SkeletonLoader = ({ title, description }: { title: string; description: string }) => {
  return (
    <SkeletonContainer>
      <Meta title={title} description={description} borderInShellHeader={true} />
      <div className="border-subtle space-y-6 border-x px-4 py-8 sm:px-6">
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
      </div>
      <div className="rounded-b-xl">
        <SectionBottomActions align="end">
          <SkeletonButton className="ml-auto h-8 w-20 rounded-md" />
        </SectionBottomActions>
      </div>
    </SkeletonContainer>
  );
};

const PasswordView = ({ user }: PasswordViewProps) => {
  const { data } = useSession();
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const metadata = userMetadataSchema.safeParse(user?.metadata);
  const initialSessionTimeout = metadata.success ? metadata.data?.sessionTimeout : undefined;

  const [sessionTimeout, setSessionTimeout] = useState<number | undefined>(initialSessionTimeout);

  const sessionMutation = trpc.viewer.updateProfile.useMutation({
    onSuccess: (data) => {
      showToast(t("session_timeout_changed"), "success");
      formMethods.reset(formMethods.getValues());
      setSessionTimeout(data.metadata?.sessionTimeout);
    },
    onSettled: () => {
      utils.viewer.me.invalidate();
    },
    onMutate: async () => {
      await utils.viewer.me.cancel();
      const previousValue = await utils.viewer.me.getData();
      const previousMetadata = userMetadataSchema.safeParse(previousValue?.metadata);

      if (previousValue && sessionTimeout && previousMetadata.success) {
        utils.viewer.me.setData(undefined, {
          ...previousValue,
          metadata: { ...previousMetadata?.data, sessionTimeout: sessionTimeout },
        });
        return { previousValue };
      }
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

  const createAccountPasswordMutation = trpc.viewer.auth.createAccountPassword.useMutation({
    onSuccess: () => {
      showToast(t("password_reset_email", { email: user.email }), "success");
    },
    onError: (error) => {
      showToast(`${t("error_creating_account_password")}, ${t(error.message)}`, "error");
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

    if (!oldPassword.length) {
      formMethods.setError(
        "oldPassword",
        { type: "required", message: t("error_required_field") },
        { shouldFocus: true }
      );
    }

    if (!newPassword.length) {
      formMethods.setError(
        "newPassword",
        { type: "required", message: t("error_required_field") },
        { shouldFocus: true }
      );
    }

    if (oldPassword && newPassword) {
      passwordMutation.mutate({ oldPassword, newPassword });
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
      <Meta title={t("password")} description={t("password_description")} borderInShellHeader={true} />
      {user && user.identityProvider !== IdentityProvider.CAL && !user.passwordAdded ? (
        <div className="border-subtle rounded-b-xl border border-t-0">
          <div className="px-4 py-6 sm:px-6">
            <h2 className="font-cal text-emphasis text-lg font-medium leading-6">
              {t("account_managed_by_identity_provider", {
                provider: identityProviderNameMap[user.identityProvider],
              })}
            </h2>

            <p className="text-subtle mt-1 text-sm">
              {t("account_managed_by_identity_provider_description", {
                provider: identityProviderNameMap[user.identityProvider],
              })}
            </p>
            <Button
              className="mt-3"
              onClick={() => createAccountPasswordMutation.mutate()}
              loading={createAccountPasswordMutation.isPending}>
              {t("create_account_password")}
            </Button>
          </div>
        </div>
      ) : (
        <Form form={formMethods} handleSubmit={handleSubmit}>
          <div className="border-subtle border-x px-4 py-6 sm:px-6">
            {formMethods.formState.errors.apiError && (
              <div className="pb-6">
                <Alert severity="error" message={formMethods.formState.errors.apiError?.message} />
              </div>
            )}
            <div className="w-full sm:grid sm:grid-cols-2 sm:gap-x-6">
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
            <p className="text-default mt-4 w-full text-sm">
              {t("invalid_password_hint", { passwordLength: passwordMinLength })}
            </p>
          </div>
          <SectionBottomActions align="end">
            <Button
              color="primary"
              type="submit"
              loading={passwordMutation.isPending}
              onClick={() => formMethods.clearErrors("apiError")}
              disabled={isDisabled || passwordMutation.isPending || sessionMutation.isPending}>
              {t("update")}
            </Button>
          </SectionBottomActions>
          <div className="mt-6">
            <SettingsToggle
              toggleSwitchAtTheEnd={true}
              title={t("session_timeout")}
              description={t("session_timeout_description")}
              checked={sessionTimeout !== undefined}
              data-testid="session-check"
              onCheckedChange={(e) => {
                if (!e) {
                  setSessionTimeout(undefined);

                  if (metadata.success) {
                    sessionMutation.mutate({
                      metadata: { ...metadata.data, sessionTimeout: undefined },
                    });
                  }
                } else {
                  setSessionTimeout(10);
                }
              }}
              childrenClassName="lg:ml-0"
              switchContainerClassName={classNames(
                "py-6 px-4 sm:px-6 border-subtle rounded-xl border",
                !!sessionTimeout && "rounded-b-none"
              )}>
              <>
                <div className="border-subtle border-x p-6 pb-8">
                  <div className="flex flex-col">
                    <p className="text-default mb-2 font-medium">{t("session_timeout_after")}</p>
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
                        setSessionTimeout(event?.value);
                      }}
                    />
                  </div>
                </div>
                <SectionBottomActions align="end">
                  <Button
                    color="primary"
                    loading={sessionMutation.isPending}
                    onClick={() => {
                      sessionMutation.mutate({
                        metadata: { ...metadata, sessionTimeout },
                      });
                      formMethods.clearErrors("apiError");
                    }}
                    disabled={
                      initialSessionTimeout === sessionTimeout ||
                      passwordMutation.isPending ||
                      sessionMutation.isPending
                    }>
                    {t("update")}
                  </Button>
                </SectionBottomActions>
              </>
            </SettingsToggle>
          </div>
        </Form>
      )}
    </>
  );
};

const PasswordViewWrapper = () => {
  const { data: user, isPending } = trpc.viewer.me.useQuery({ includePasswordAdded: true });
  const { t } = useLocale();
  if (isPending || !user)
    return <SkeletonLoader title={t("password")} description={t("password_description")} />;

  return <PasswordView user={user} />;
};

PasswordViewWrapper.getLayout = getLayout;
PasswordViewWrapper.PageWrapper = PageWrapper;

export default PasswordViewWrapper;
