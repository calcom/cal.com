import { IdentityProvider } from "@prisma/client";
import { Trans } from "next-i18next";
import { Controller, useForm } from "react-hook-form";

import { identityProviderNameMap } from "@calcom/lib/auth";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/v2/core/Button";
import Meta from "@calcom/ui/v2/core/Meta";
import { Form, TextField } from "@calcom/ui/v2/core/form/fields";
import { getLayout } from "@calcom/ui/v2/core/layouts/AdminLayout";
import showToast from "@calcom/ui/v2/core/notifications";

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

  const formMethods = useForm();

  return (
    <>
      <Meta title="password" description="password_description" />
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
        <Form
          form={formMethods}
          handleSubmit={async (values) => {
            const { oldPassword, newPassword } = values;
            mutation.mutate({ oldPassword, newPassword });
          }}>
          <div className="max-w-[38rem] sm:flex sm:space-x-4">
            <div className="flex-grow">
              <Controller
                name="oldPassword"
                control={formMethods.control}
                render={({ field: { value } }) => (
                  <TextField
                    name="oldPassword"
                    label={t("old_password")}
                    value={value}
                    type="password"
                    onChange={(e) => {
                      formMethods.setValue("oldPassword", e?.target.value);
                    }}
                  />
                )}
              />
            </div>
            <div className="flex-grow">
              <Controller
                name="newPassword"
                control={formMethods.control}
                render={({ field: { value } }) => (
                  <TextField
                    name="newPassword"
                    label={t("new_password")}
                    value={value}
                    type="password"
                    placeholder={t("secure_password")}
                    onChange={(e) => {
                      formMethods.setValue("newPassword", e?.target.value);
                    }}
                  />
                )}
              />
            </div>
          </div>
          <p className="text-sm text-gray-600">
            <Trans i18nKey="valid_password">
              Password must be at least at least 7 characters, mix of uppercase & lowercase letters, and
              contain at least 1 number
            </Trans>
          </p>
          <Button color="primary" className="mt-8" disabled={formMethods.formState.isSubmitting}>
            {t("update")}
          </Button>
        </Form>
      )}
    </>
  );
};

PasswordView.getLayout = getLayout;

export default PasswordView;
