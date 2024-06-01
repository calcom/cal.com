import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Form, PasswordField, InputField, Button, showToast } from "@calcom/ui";

import type { AppKeys } from "../zod";

export enum FormAction {
  CREATE,
  UPDATE,
}

type CredentialsFormProps = {
  form: UseFormReturn<AppKeys, any>;
} & (CredentialCreationForm | CredentialUpdateForm);

export type CredentialCreationForm = { action: FormAction.CREATE; onCreate?: (props: AppKeys) => void };
export type CredentialUpdateForm = {
  action: FormAction.UPDATE;
  credentialId: number;
  onSubmit?: (props: { key: AppKeys; credentialId: number }) => void;
};

export const CredentialsForm = (props: CredentialsFormProps) => {
  const [loading, setLoading] = useState(false);

  const { t } = useLocale();

  return (
    <Form
      form={props.form}
      className="flex w-[100%] flex-col justify-between space-y-4"
      handleSubmit={async (values) => {
        try {
          setLoading(true);
          if (props.action === FormAction.UPDATE && props.onSubmit) {
            props.onSubmit({
              credentialId: props.credentialId,
              key: values,
            });
          } else if (props.action === FormAction.CREATE && props.onCreate) {
            props.onCreate(values);
          } else {
            showToast("Error. Please contact your developer.", "error");
          }

          setLoading(false);
        } catch (e) {
          console.log(e);
        }
      }}>
      <Controller
        name="endpoint"
        control={props.form.control}
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
        control={props.form.control}
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
        control={props.form.control}
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
                data-dirty={props.form.formState.isDirty}
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
