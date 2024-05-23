import type { UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";

import { Form, PasswordField, InputField, Button } from "@calcom/ui";

export const CredentialsForm = ({
  form,
  updateAppCredentialsMutation,
  credentialId,
}: {
  form: UseFormReturn<{
    apiKey: string;
    projectId: string;
    endpoint: string;
  }>;
  updateAppCredentialsMutation: any;
  credentialId: number;
}) => {
  return (
    <Form
      form={form}
      className="flex w-[80%] flex-col justify-between space-y-4"
      handleSubmit={async (values) => {
        try {
          updateAppCredentialsMutation({
            credentialId: credentialId,
            key: values,
          });
        } catch (e) {
          console.log(e);
        }
      }}>
      <Controller
        name="endpoint"
        control={form.control}
        render={({ field: { onBlur, onChange, value }, fieldState }) => (
          <div className="col-span-4 col-start-2 row-start-1 flex flex-row items-end space-x-5">
            <InputField
              required
              onChange={onChange}
              onBlur={onBlur}
              value={value}
              name="Endpoint"
              className="mb-1"
              data-dirty={fieldState.isDirty}
              containerClassName="w-[100%] data-[dirty=true]:w-[90%] duration-300"
            />
          </div>
        )}
      />
      <Controller
        name="projectId"
        control={form.control}
        render={({ field: { onBlur, onChange, value }, fieldState }) => (
          <div className="col-span-4 col-start-2 row-start-2 flex flex-row items-end space-x-5">
            <InputField
              required
              onChange={onChange}
              onBlur={onBlur}
              value={value}
              name="Project ID"
              className="mb-1"
              data-dirty={fieldState.isDirty}
              containerClassName="w-[100%] data-[dirty=true]:w-[90%] duration-300"
            />
          </div>
        )}
      />
      <Controller
        name="apiKey"
        control={form.control}
        render={({ field: { onBlur, onChange, value }, formState }) => {
          console.log({ d: formState.isDirty });
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
