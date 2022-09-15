import { IdentityProvider } from "@prisma/client";
import { Trans } from "next-i18next";
import { useForm } from "react-hook-form";

import { identityProviderNameMap } from "@calcom/lib/auth";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import Button from "@calcom/ui/v2/core/Button";
import Meta from "@calcom/ui/v2/core/Meta";
import { Form, TextField } from "@calcom/ui/v2/core/form/fields";
import { getLayout } from "@calcom/ui/v2/core/layouts/SettingsLayout";
import showToast from "@calcom/ui/v2/core/notifications";

type ChangePasswordFormValues = {
  oldPassword: string;
  newPassword: string;
};

const PasswordView = () => {
  const { t } = useLocale();
  const { data: user } = trpc.useQuery(["viewer.me"]);

  const mutation = trpc.useMutation("viewer.auth.changePassword", {
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
      <Meta title="Password" description="Manage settings for your account passwords" />
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
        <Form<ChangePasswordFormValues> form={formMethods} handleSubmit={handleSubmit}>
          <div className="max-w-[38rem] sm:flex sm:space-x-4">
            <div className="flex-grow">
              <TextField {...register("oldPassword")} label={t("old_password")} type="password" />
            </div>
            <div className="flex-grow">
              <TextField
                {...register("newPassword")}
                label={t("new_password")}
                type="password"
                placeholder={t("secure_password")}
              />
            </div>
          </div>
          <p className="text-sm text-gray-600">
            <Trans i18nKey="valid_password">
              Password must be at least at least 7 characters, mix of uppercase & lowercase letters, and
              contain at least 1 number
            </Trans>
          </p>
          {/* TODO: Why is this Form not submitting? Hacky fix but works */}
          <Button
            color="primary"
            className="mt-8"
            disabled={isSubmitting || mutation.isLoading}
            onClick={() => handleSubmit(formMethods.getValues())}>
            {t("update")}
          </Button>
        </Form>
      )}
    </>
  );
};

PasswordView.getLayout = getLayout;

export default PasswordView;
