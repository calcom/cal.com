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

type ChangePasswordFormValues = {
  oldPassword: string;
  newPassword: string;
};

const PasswordView = () => {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const { data: user } = trpc.viewer.me.useQuery();

  const sessionMutation = trpc.viewer.updateProfile.useMutation({
    onSuccess: () => {
      showToast(t("profile_updated_successfully"), "success");
      sessionFormMethods.reset(sessionFormMethods.getValues());
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
      showToast(`${t("error")}, ${error.message}`, "error");
    },
  });

  const passwordMutation = trpc.viewer.auth.changePassword.useMutation({
    onSuccess: () => {
      showToast(t("password_has_been_changed"), "success");
    },
    onError: (error) => {
      showToast(`${t("error_updating_password")}, ${error.message}`, "error");
    },
  });

  const passwordFormMethods = useForm<ChangePasswordFormValues>({
    defaultValues: {
      oldPassword: "",
      newPassword: "",
    },
  });

  const handleSubmit = (values: ChangePasswordFormValues) => {
    const { oldPassword, newPassword } = values;
    passwordMutation.mutate({ oldPassword, newPassword });
  };

  const sessionFormMethods = useForm<{ sessionTimeout: number | undefined }>({
    defaultValues: {
      sessionTimeout: user?.metadata?.sessionTimeout,
    },
  });

  const [sessionState, setSessionState] = useState<number | undefined>(user?.metadata?.sessionTimeout);

  const isDisabled = sessionFormMethods.formState.isSubmitting || !sessionFormMethods.formState.isDirty;

  const timeoutOptions = [5, 10, 15].map((mins) => ({
    label: t("multiple_duration_mins", { count: mins }),
    value: mins,
  }));

  return (
    <>
      <Meta title={t("password")} description={t("password_description")} />
      <Form
        form={sessionFormMethods}
        className="mb-8 w-auto"
        handleSubmit={({ sessionTimeout }) => {
          sessionMutation.mutate({ metadata: { ...user?.metadata, sessionTimeout } });
        }}>
        <SettingsToggle
          title={t("session_timeout")}
          description={t("session_timeout_description")}
          checked={sessionState !== undefined}
          data-testid="session-check"
          onCheckedChange={(e) => {
            if (!e) {
              sessionFormMethods.setValue("sessionTimeout", undefined, { shouldDirty: true });
              setSessionState(undefined);
            } else {
              sessionFormMethods.setValue("sessionTimeout", 10, { shouldDirty: true });
              setSessionState(10);
            }
          }}
        />
        {sessionState && (
          <div data-testid="session-collapsible" className="mt-4 text-sm">
            <div className="flex items-center">
              <p className="text-neutral-900 ltr:mr-2 rtl:ml-2">{t("session_timeout_after")}</p>
              <Select
                options={timeoutOptions}
                defaultValue={timeoutOptions[1]}
                isSearchable={false}
                className="block h-[36px] !w-auto min-w-0 flex-none rounded-md text-sm"
                onChange={(event) => {
                  sessionFormMethods.setValue("sessionTimeout", event?.value, { shouldDirty: true });
                  setSessionState(event?.value);
                }}
              />
            </div>
          </div>
        )}
        <Button color="primary" className="mt-8" type="submit" disabled={isDisabled}>
          {t("update")}
        </Button>
      </Form>
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
        <Form form={passwordFormMethods} handleSubmit={handleSubmit}>
          <div className="max-w-[38rem] sm:flex sm:space-x-4">
            <div className="flex-grow">
              <PasswordField {...passwordFormMethods.register("oldPassword")} label={t("old_password")} />
            </div>
            <div className="flex-grow">
              <PasswordField {...passwordFormMethods.register("newPassword")} label={t("new_password")} />
            </div>
          </div>
          <p className="text-sm text-gray-600">
            <Trans i18nKey="invalid_password_hint">
              Password must be at least at least 7 characters, mix of uppercase & lowercase letters, and
              contain at least 1 number
            </Trans>
          </p>
          {/* TODO: Why is this Form not submitting? Hacky fix but works */}
          <Button
            color="primary"
            className="mt-8"
            type="submit"
            disabled={!passwordFormMethods.formState.isSubmitting || !passwordMutation.isLoading}>
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
