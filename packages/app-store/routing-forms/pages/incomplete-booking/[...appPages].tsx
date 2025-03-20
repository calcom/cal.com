"use client";

import { useState, useEffect } from "react";
import type z from "zod";

import { WhenToWriteToRecord, SalesforceFieldType } from "@calcom/app-store/salesforce/lib/enums";
import type { writeToRecordDataSchema as salesforceWriteToRecordDataSchema } from "@calcom/app-store/salesforce/zod";
import { routingFormIncompleteBookingDataSchema as salesforceRoutingFormIncompleteBookingDataSchema } from "@calcom/app-store/salesforce/zod";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { IncompleteBookingActionType } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import { Switch } from "@calcom/ui/components/form";
import { InputField } from "@calcom/ui/components/form";
import { Select } from "@calcom/ui/components/form";
import { Button } from "@calcom/ui/components/button";
import { showToast } from "@calcom/ui/components/toast";

import SingleForm, {
  getServerSidePropsForSingleFormView as getServerSideProps,
} from "../../components/SingleForm";
import type { RoutingFormWithResponseCount } from "../../components/SingleForm";

function Page({ form }: { form: RoutingFormWithResponseCount }) {
  const { t } = useLocale();
  const { data, isLoading } = trpc.viewer.appRoutingForms.getIncompleteBookingSettings.useQuery({
    formId: form.id,
  });

  const mutation = trpc.viewer.appRoutingForms.saveIncompleteBookingSettings.useMutation({
    onSuccess: () => {
      showToast(t("success"), "success");
    },
    onError: (error) => {
      showToast(t(`error: ${error.message}`), "error");
    },
  });

  const [salesforceWriteToRecordObject, setSalesforceWriteToRecordObject] = useState<
    z.infer<typeof salesforceWriteToRecordDataSchema>
  >({});

  // Handle just Salesforce for now but need to expand this to other apps
  const [salesforceActionEnabled, setSalesforceActionEnabled] = useState<boolean>(false);

  const fieldTypeOptions = [{ label: t("text"), value: SalesforceFieldType.TEXT }];

  const [selectedFieldType, setSelectedFieldType] = useState(fieldTypeOptions[0]);

  const whenToWriteToRecordOptions = [
    { label: t("on_every_instance"), value: WhenToWriteToRecord.EVERY_BOOKING },
    { label: t("only_if_field_is_empty"), value: WhenToWriteToRecord.FIELD_EMPTY },
  ];

  const [selectedWhenToWrite, setSelectedWhenToWrite] = useState(whenToWriteToRecordOptions[0]);

  const [newSalesforceAction, setNewSalesforceAction] = useState({
    field: "",
    fieldType: selectedFieldType.value,
    value: "",
    whenToWrite: WhenToWriteToRecord.FIELD_EMPTY,
  });

  const credentialOptions = data?.credentials.map((credential) => ({
    label: credential.team?.name,
    value: credential.id,
  }));

  const [selectedCredential, setSelectedCredential] = useState(
    Array.isArray(credentialOptions) ? credentialOptions[0] : null
  );

  useEffect(() => {
    const salesforceAction = data?.incompleteBookingActions.find(
      (action) => action.actionType === IncompleteBookingActionType.SALESFORCE
    );

    if (salesforceAction) {
      setSalesforceActionEnabled(salesforceAction.enabled);

      const parsedSalesforceActionData = salesforceRoutingFormIncompleteBookingDataSchema.safeParse(
        salesforceAction.data
      );
      if (parsedSalesforceActionData.success) {
        setSalesforceWriteToRecordObject(parsedSalesforceActionData.data?.writeToRecordObject ?? {});
      }

      setSelectedCredential(
        credentialOptions
          ? credentialOptions.find((option) => option.value === salesforceAction?.credentialId) ??
              selectedCredential
          : selectedCredential
      );
    }
  }, [data]);

  if (isLoading) {
    return <div>Loading...</div>;
  }
  return (
    <>
      <div className="bg-default border-subtle rounded-md border p-8">
        <div>
          <Switch
            labelOnLeading
            label="Write to Salesforce contact/lead record"
            checked={salesforceActionEnabled}
            onCheckedChange={(checked) => {
              setSalesforceActionEnabled(checked);
            }}
          />
        </div>

        {salesforceActionEnabled ? (
          <>
            <hr className="mt-4 border" />

            {form.team && (
              <>
                <div className="mt-2">
                  <p>Credential to use</p>
                  <Select
                    options={credentialOptions}
                    value={selectedCredential}
                    onChange={(option) => {
                      if (!option) {
                        return;
                      }
                      setSelectedCredential(option);
                    }}
                  />
                </div>

                <hr className="mt-4 border" />
              </>
            )}

            <div className="mt-2">
              <div className="grid grid-cols-5 gap-4">
                <div>{t("field_name")}</div>
                <div>{t("field_type")}</div>
                <div>{t("value")}</div>
                <div>{t("when_to_write")}</div>
              </div>
              <div>
                {Object.keys(salesforceWriteToRecordObject).map((key) => {
                  const action =
                    salesforceWriteToRecordObject[key as keyof typeof salesforceWriteToRecordObject];
                  return (
                    <div className="mt-2 grid grid-cols-5 gap-4" key={key}>
                      <div>
                        <InputField value={key} readOnly />
                      </div>
                      <div>
                        <Select
                          value={fieldTypeOptions.find((option) => option.value === action.fieldType)}
                          isDisabled={true}
                        />
                      </div>
                      <div>
                        <InputField value={action.value} readOnly />
                      </div>
                      <div>
                        <Select
                          value={whenToWriteToRecordOptions.find(
                            (option) => option.value === action.whenToWrite
                          )}
                          isDisabled={true}
                        />
                      </div>
                      <div>
                        <Button
                          StartIcon="trash"
                          variant="icon"
                          color="destructive"
                          onClick={() => {
                            const newActions = { ...salesforceWriteToRecordObject };
                            delete newActions[key];
                            setSalesforceWriteToRecordObject(newActions);
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="mt-2 grid grid-cols-5 gap-4">
                  <div>
                    <InputField
                      value={newSalesforceAction.field}
                      onChange={(e) =>
                        setNewSalesforceAction({
                          ...newSalesforceAction,
                          field: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Select
                      options={fieldTypeOptions}
                      value={selectedFieldType}
                      onChange={(e) => {
                        if (e) {
                          setSelectedFieldType(e);
                          setNewSalesforceAction({
                            ...newSalesforceAction,
                            fieldType: e.value,
                          });
                        }
                      }}
                    />
                  </div>
                  <div>
                    <InputField
                      value={newSalesforceAction.value}
                      onChange={(e) =>
                        setNewSalesforceAction({
                          ...newSalesforceAction,
                          value: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Select
                      options={whenToWriteToRecordOptions}
                      value={selectedWhenToWrite}
                      onChange={(e) => {
                        if (e) {
                          setSelectedWhenToWrite(e);
                          setNewSalesforceAction({
                            ...newSalesforceAction,
                            whenToWrite: e.value,
                          });
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
              <Button
                className="mt-2"
                size="sm"
                disabled={
                  !(
                    newSalesforceAction.field &&
                    newSalesforceAction.fieldType &&
                    newSalesforceAction.value &&
                    newSalesforceAction.whenToWrite
                  )
                }
                onClick={() => {
                  if (Object.keys(salesforceWriteToRecordObject).includes(newSalesforceAction.field.trim())) {
                    showToast("Field already exists", "error");
                    return;
                  }

                  setSalesforceWriteToRecordObject({
                    ...salesforceWriteToRecordObject,
                    [newSalesforceAction.field]: {
                      fieldType: newSalesforceAction.fieldType,
                      value: newSalesforceAction.value,
                      whenToWrite: newSalesforceAction.whenToWrite,
                    },
                  });

                  setNewSalesforceAction({
                    field: "",
                    fieldType: selectedFieldType.value,
                    value: "",
                    whenToWrite: WhenToWriteToRecord.FIELD_EMPTY,
                  });
                }}>
                {t("add_new_field")}
              </Button>
            </div>
          </>
        ) : null}
      </div>
      <div className="mt-2 flex justify-end">
        <Button
          size="sm"
          disabled={mutation.isPending}
          onClick={() => {
            mutation.mutate({
              formId: form.id,
              data: {
                writeToRecordObject: salesforceWriteToRecordObject,
              },
              actionType: IncompleteBookingActionType.SALESFORCE,
              enabled: salesforceActionEnabled,
              credentialId: selectedCredential?.value ?? data?.credentials[0].id,
            });
          }}>
          {t("save")}
        </Button>
      </div>
    </>
  );
}

export default function IncompleteBookingPage({
  form,
  appUrl,
  enrichedWithUserProfileForm,
}: inferSSRProps<typeof getServerSideProps> & { appUrl: string }) {
  return (
    <SingleForm
      form={form}
      appUrl={appUrl}
      enrichedWithUserProfileForm={enrichedWithUserProfileForm}
      Page={Page}
    />
  );
}

export { getServerSideProps };
