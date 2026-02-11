"use client";

import { useState, useEffect } from "react";
import type z from "zod";

import type { RoutingFormWithResponseCount } from "@calcom/app-store/routing-forms/types/types";
import { WhenToWriteToRecord, SalesforceFieldType } from "@calcom/app-store/salesforce/lib/enums";
import type { writeToRecordDataSchema as salesforceWriteToRecordDataSchema } from "@calcom/app-store/salesforce/zod";
import { routingFormIncompleteBookingDataSchema as salesforceRoutingFormIncompleteBookingDataSchema } from "@calcom/app-store/salesforce/zod";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { IncompleteBookingActionType } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import { Button } from "@calcom/ui/components/button";
import { Switch } from "@calcom/ui/components/form";
import { InputField } from "@calcom/ui/components/form";
import { Select } from "@calcom/ui/components/form";
import { Label } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";
import type { getServerSidePropsForSingleFormView as getServerSideProps } from "@calcom/web/lib/apps/routing-forms/[...pages]/getServerSidePropsSingleForm";

import SingleForm from "@components/apps/routing-forms/SingleForm";

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
          ? (credentialOptions.find((option) => option.value === salesforceAction?.credentialId) ??
              selectedCredential)
          : selectedCredential
      );
    }
  }, [data]);

  if (isLoading) {
    return <div>Loading...</div>;
  }
  return (
    <>
      <div className="bg-default border-subtle mt-4 rounded-2xl border px-4 py-2">
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-0.5">
              <div className="border-subtle rounded-lg border p-1">
                <Icon name="globe" className="text-subtle h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-emphasis ml-2 text-sm font-medium">
                  Write to Salesforce contact/lead record
                </span>
              </div>
            </div>
            <Switch
              size="sm"
              checked={salesforceActionEnabled}
              onCheckedChange={(checked) => {
                setSalesforceActionEnabled(checked);
              }}
            />
          </div>
          {salesforceActionEnabled ? (
            <div className="bg-cal-muted mt-1 rounded-xl p-2">
              {form.team && (
                <>
                  <div className="bg-default mt-2 rounded-xl px-2 py-2">
                    <Label>Credential to use</Label>
                    <Select
                      size="sm"
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
                </>
              )}

              <div className="bg-default mt-2 rounded-xl px-2 py-2">
                <div className="hidden md:grid md:grid-cols-5 md:gap-4">
                  <Label>{t("field_name")}</Label>
                  <Label>{t("field_type")}</Label>
                  <Label>{t("value")}</Label>
                  <Label>{t("when_to_write")}</Label>
                </div>
                <div>
                  {Object.keys(salesforceWriteToRecordObject).map((key) => {
                    const action =
                      salesforceWriteToRecordObject[key as keyof typeof salesforceWriteToRecordObject];
                    return (
                      <div
                        className="mt-2 border-subtle flex flex-col gap-3 rounded-lg border p-3 md:mt-2 md:grid md:grid-cols-5 md:gap-4 md:border-0 md:p-0"
                        key={key}>
                        <div className="w-full">
                          <Label className="md:hidden">{t("field_name")}</Label>
                          <InputField value={key} readOnly />
                        </div>
                        <div className="w-full">
                          <Label className="md:hidden">{t("field_type")}</Label>
                          <Select
                            value={fieldTypeOptions.find((option) => option.value === action.fieldType)}
                            isDisabled={true}
                          />
                        </div>
                        <div className="w-full">
                          <Label className="md:hidden">{t("value")}</Label>
                          <InputField value={action.value as string} readOnly />
                        </div>
                        <div className="w-full">
                          <Label className="md:hidden">{t("when_to_write")}</Label>
                          <Select
                            value={whenToWriteToRecordOptions.find(
                              (option) => option.value === action.whenToWrite
                            )}
                            isDisabled={true}
                          />
                        </div>
                        <div className="flex justify-end md:justify-start">
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
                  <div className="mt-2 border-subtle flex flex-col gap-4 rounded-lg border p-3 md:mt-2 md:grid md:grid-cols-5 md:gap-4 md:border-0 md:p-0">
                    <div>
                      <Label className="md:hidden">{t("field_name")}</Label>
                      <InputField
                        size="sm"
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
                      <Label className="md:hidden">{t("field_type")}</Label>
                      <Select
                        size="sm"
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
                      <Label className="md:hidden">{t("value")}</Label>
                      <InputField
                        size="sm"
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
                      <Label className="md:hidden">{t("when_to_write")}</Label>
                      <Select
                        size="sm"
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
                    if (
                      Object.keys(salesforceWriteToRecordObject).includes(newSalesforceAction.field.trim())
                    ) {
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
            </div>
          ) : null}
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
      </div>
    </>
  );
}

export default function IncompleteBookingPage({
  form,
  appUrl,
  enrichedWithUserProfileForm,
  permissions,
}: inferSSRProps<typeof getServerSideProps> & { appUrl: string }) {
  return (
    <SingleForm
      form={form}
      appUrl={appUrl}
      enrichedWithUserProfileForm={enrichedWithUserProfileForm}
      permissions={permissions}
      Page={Page}
    />
  );
}
