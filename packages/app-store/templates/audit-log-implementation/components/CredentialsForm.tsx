import { useState } from "react";
import { Controller } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Form, PasswordField, InputField, Button, showToast } from "@calcom/ui";

import { useAppCredential } from "../context/CredentialContext";

export const CredentialsForm = () => {
  const { credentialId, form } = useAppCredential();
  const [loading, setLoading] = useState(false);

  const { t } = useLocale();
  const updateAppCredentialsMutation = trpc.viewer.appsRouter.updateAppCredentials.useMutation({
    onSuccess: () => {
      showToast(t("keys_have_been_saved"), "success");
      form.reset(form.getValues());
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  return (
    <Form
      form={form}
      className="flex w-[100%] flex-col justify-between space-y-4"
      handleSubmit={async (values) => {
        try {
          setLoading(true);
          updateAppCredentialsMutation.mutate({
            credentialId: credentialId,
            key: values,
          });
          setLoading(false);
        } catch (e) {
          console.log(e);
        }
      }}>
      <Controller
        name="endpoint"
        control={form.control}
        render={({ field: { onBlur, onChange, value } }) => (
          <div className="col-span-4 col-start-2 row-start-1 flex flex-row items-end space-x-5">
            <InputField
              required
              onChange={onChange}
              onBlur={onBlur}
              value={value}
              name="Endpoint"
              className="mb-1"
              containerClassName="w-[100%]"
            />
          </div>
        )}
      />
      <Controller
        name="projectId"
        control={form.control}
        render={({ field: { onBlur, onChange, value } }) => (
          <div className="col-span-4 col-start-2 row-start-2 flex flex-row items-end space-x-5">
            <InputField
              required
              onChange={onChange}
              onBlur={onBlur}
              value={value}
              name="Project ID"
              className="mb-1"
              containerClassName="w-[100%]"
            />
          </div>
        )}
      />
      <Controller
        name="apiKey"
        control={form.control}
        render={({ field: { onBlur, onChange, value } }) => {
          return (
            <div className="col-span-4 col-start-2 row-start-3 flex flex-row items-end space-x-5">
              <PasswordField
                onChange={onChange}
                onBlur={onBlur}
                name="API Key"
                value={value}
                className="mb-0"
                containerClassName="w-[100%] data-[dirty=true]:w-[90%] duration-300"
              />{" "}
              <Button
                data-dirty={form.formState.isDirty}
                className="mb-1 data-[dirty=false]:hidden"
                loading={loading}
                type="submit">
                Submit
              </Button>
            </div>
          );
        }}
      />
    </Form>
  );
};
