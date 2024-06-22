import { useRef, useEffect } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { showToast } from "@calcom/ui";

import { useAppCredential } from "../../context/CredentialContext";
import type { AppKeysForm } from "../../zod";
import { appKeysFormSchema } from "../../zod";
import { FormFieldTypes, type FormField } from "./FormFieldRenderer";
import { ForwardedFormRenderer, type FormRendererHandles } from "./FormRenderer";

// onSubmit will be passed in only when form is being used to create credential,
// in which case isLoading state is managed by the parent.
type AppKeyFormProps = {
  onCreate?: (values: AppKeysForm) => Promise<void>;
  isLoading?: boolean;
};

export const AppKeyForm = (props: AppKeyFormProps) => {
  const { t } = useLocale();
  const { appKey } = useAppCredential();
  const { mutate: updateAppKey, isPending } = trpc.viewer.appsRouter.updateAppCredentials.useMutation({
    onSuccess: () => {
      showToast(t("keys_have_been_saved"), "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const refForm = useRef<FormRendererHandles<AppKeysForm>>(null);
  const projectUpdateFormFields: FormField<never>[] = [
    {
      name: "projectId",
      label: "Project Id",
      type: FormFieldTypes.STRING,
    },
    {
      name: "endpoint",
      label: "Endpoint",
      type: FormFieldTypes.STRING,
    },
    {
      name: "apiKey",
      label: "API Key",
      type: FormFieldTypes.PASSWORD,
    },
  ];

  const loadingStatus = props.onCreate ? props.isLoading : isPending;

  useEffect(() => {
    if (refForm.current) {
      refForm.current.reset(appKey);
    }
  }, [appKey]);

  async function handleSubmit(values: AppKeysForm) {
    if (refForm.current) {
      if (!props.onCreate) {
        updateAppKey({
          credentialId: 1,
          key: {
            ...values,
            disabledEvents: {},
          },
        });
      } else {
        await props.onCreate(values);
      }
      refForm.current.reset(refForm.current.getValues());
    }
  }
  return (
    <ForwardedFormRenderer<never, AppKeysForm>
      fields={projectUpdateFormFields}
      FormZodSchema={appKeysFormSchema}
      onSubmit={handleSubmit}
      defaultValues={appKey}
      isLoading={loadingStatus}
      showInternalButton
      ref={refForm}
    />
  );
};
