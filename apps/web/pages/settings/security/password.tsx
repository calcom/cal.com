import { IdentityProvider } from "@prisma/client";
import { GetServerSidePropsContext } from "next";
import { Trans } from "next-i18next";
import { useForm } from "react-hook-form";

import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { identityProviderNameMap } from "@calcom/lib/auth";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, Form, Meta, PasswordField, showToast } from "@calcom/ui";

import { ssrInit } from "@server/lib/ssr";

type ChangePasswordFormValues = {
  oldPassword: string;
  newPassword: string;
};

const PasswordView = () => {
  const { t } = useLocale();
  const { data: user } = trpc.viewer.me.useQuery();

  const mutation = trpc.viewer.auth.changePassword.useMutation({
    onSuccess: () => {
      showToast(t("password_has_been_changed"), "success");
    },
    onError: (error) => {
      showToast(`${t("error_updating_password")}, ${error.message}`, "error");
    },
  });

  const formMethods = useForm<ChangePasswordFormValues>({
    defaultValues: {
      oldPassword: "",
      newPassword: "",
    },
  });

  const {
    register,
    formState: { isSubmitting },
  } = formMethods;

  const handleSubmit = (values: ChangePasswordFormValues) => {
    const { oldPassword, newPassword } = values;
    mutation.mutate({ oldPassword, newPassword });
  };

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
              <PasswordField {...register("oldPassword")} label={t("old_password")} />
            </div>
            <div className="flex-grow">
              <PasswordField {...register("newPassword")} label={t("new_password")} />
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
            disabled={isSubmitting || mutation.isLoading}>
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
