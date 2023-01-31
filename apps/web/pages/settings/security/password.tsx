import { IdentityProvider } from "@prisma/client";
import { GetServerSidePropsContext } from "next";
import { Trans } from "next-i18next";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { identityProviderNameMap } from "@calcom/lib/auth";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { userMetadata } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import { Button, Form, Meta, PasswordField, Select, SettingsToggle, showToast } from "@calcom/ui";

import { ssrInit } from "@server/lib/ssr";

type ChangePasswordSessionFormValues = {
  oldPassword: string;
  newPassword: string;
  sessionTimeout?: number;
};

const PasswordView = () => {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const { data: user } = trpc.viewer.me.useQuery();
  const metadata = userMetadata.parse(user?.metadata);

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

      if (previousValue && metadata?.sessionTimeout) {
        utils.viewer.me.setData(undefined, {
          ...previousValue,
          metadata: { ...previousMetadata, sessionTimeout: metadata?.sessionTimeout },
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
    },
    onError: (error) => {
      showToast(`${t("error_updating_password")}, ${error.message}`, "error");
    },
  });

  const formMethods = useForm<ChangePasswordSessionFormValues>({
    defaultValues: {
      oldPassword: "",
      newPassword: "",
      sessionTimeout: metadata?.sessionTimeout,
    },
  });

  const sessionTimeoutWatch = formMethods.watch("sessionTimeout");

  const handleSubmit = (values: ChangePasswordSessionFormValues) => {
    const { oldPassword, newPassword, sessionTimeout } = values;
    if (oldPassword && newPassword) {
      passwordMutation.mutate({ oldPassword, newPassword });
    }
    if (metadata?.sessionTimeout !== sessionTimeout) {
      sessionMutation.mutate({ metadata: { ...metadata, sessionTimeout } });
    }
  };

  const timeoutOptions = [5, 10, 15].map((mins) => ({
    label: t("multiple_duration_mins", { count: mins }),
    value: mins,
  }));

  const isDisabled = formMethods.formState.isSubmitting || !formMethods.formState.isDirty;

  return (
    <>
      <Meta title={t("password")} description={t("password_description")} />
      {user && user.identityProvider !== IdentityProvider.CAL ? (
        <div>
          <div className="mt-6">
            <h2 className="font-cal text-lg font-medium leading-6 text-gray-900">
              {t("account_managed_by_identity_provider", {
                provider: identityProviderNameMap[user.identityProvider],
              })}
            </h2>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {t("account_managed_by_identity_provider_description", {
              provider: identityProviderNameMap[user.identityProvider],
            })}
          </p>
        </div>
      ) : (
        <Form form={formMethods} handleSubmit={handleSubmit}>
          <div className="max-w-[38rem] sm:flex sm:space-x-4">
            <div className="flex-grow">
              <PasswordField {...formMethods.register("oldPassword")} label={t("old_password")} />
            </div>
            <div className="flex-grow">
              <PasswordField {...formMethods.register("newPassword")} label={t("new_password")} />
            </div>
          </div>
          <p className="mt-4 max-w-[38rem] text-sm text-gray-600">
            <Trans i18nKey="invalid_password_hint">
              Password must be at least at least 7 characters, mix of uppercase & lowercase letters, and
              contain at least 1 number.
            </Trans>
          </p>
          <div className="mt-8 border-t border-gray-200 py-8">
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
                  <p className="text-neutral-900 ltr:mr-2 rtl:ml-2">{t("session_timeout_after")}</p>
                  <Select
                    options={timeoutOptions}
                    defaultValue={
                      metadata?.sessionTimeout
                        ? timeoutOptions.find((tmo) => tmo.value === metadata.sessionTimeout)
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

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);

  return {
    props: {
      trpcState: ssr.dehydrate(),
    },
  };
};

export default PasswordView;
