"use client";

import { Controller } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Dialog } from "@calcom/ui/components/dialog";
import { DialogContent, DialogHeader, DialogFooter as BaseDialogFooter } from "@calcom/ui/components/dialog";
import { Form, Label, Switch, TextField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";

import type { PhoneNumberFormValues } from "../../types/schemas";

interface ImportNumberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneNumberForm: UseFormReturn<PhoneNumberFormValues>;
  showAdvancedFields: boolean;
  setShowAdvancedFields: (show: boolean) => void;
  agentId?: string | null;
  workflowId?: string;
  teamId?: number;
}

export function ImportNumberDialog({
  open,
  onOpenChange,
  phoneNumberForm,
  showAdvancedFields,
  setShowAdvancedFields,
  agentId,
  workflowId,
  teamId,
}: ImportNumberDialogProps) {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const importNumberMutation = trpc.viewer.phoneNumber.import.useMutation({
    onSuccess: async () => {
      showToast(t("phone_number_imported_successfully"), "success");
      onOpenChange(false);
      phoneNumberForm.reset();

      await utils.viewer.me.get.invalidate();
      if (agentId) {
        await utils.viewer.aiVoiceAgent.get.invalidate({ id: agentId });
      }
    },
    onError: (error: { message: string }) => {
      showToast(error.message, "error");
    },
  });

  const handleImportPhoneNumber = (values: PhoneNumberFormValues) => {
    if (!agentId) {
      showToast(t("agent_required_for_import"), "error");
      return;
    }
    const mutationPayload = {
      ...values,
      workflowId: workflowId,
      agentId: agentId,
      teamId: teamId,
    };
    importNumberMutation.mutate(mutationPayload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent enableOverflow type="creation">
        <DialogHeader title={t("import_phone_number")} subtitle={t("import_phone_number_description")} />

        <Form form={phoneNumberForm} handleSubmit={(values) => handleImportPhoneNumber(values)}>
          <div className="stack-y-6">
            <Controller
              name="phoneNumber"
              control={phoneNumberForm.control}
              render={({ field: { value } }) => (
                <TextField
                  name="phoneNumber"
                  label={
                    <span className="flex items-center gap-1">
                      {t("phone_number")}
                      <Tooltip content={t("phone_number_info_tooltip")}>
                        <Icon name="info" className="text-muted h-4 w-4 cursor-pointer" />
                      </Tooltip>
                    </span>
                  }
                  value={value}
                  required
                  type="text"
                  placeholder="eg:- +12088782105"
                  onChange={(e) => {
                    phoneNumberForm.setValue("phoneNumber", e?.target.value, { shouldDirty: true });
                  }}
                />
              )}
            />

            <Controller
              name="terminationUri"
              control={phoneNumberForm.control}
              render={({ field: { value } }) => (
                <TextField
                  name="terminationUri"
                  label={
                    <span className="flex items-center gap-1">
                      {t("termination_uri")}
                      <Tooltip content={t("termination_uri_info_tooltip")}>
                        <Icon name="info" className="text-muted h-4 w-4 cursor-pointer" />
                      </Tooltip>
                    </span>
                  }
                  value={value}
                  required
                  type="text"
                  placeholder="sip.example.co.pstn.twilio.com"
                  onChange={(e) => {
                    phoneNumberForm.setValue("terminationUri", e?.target.value, { shouldDirty: true });
                  }}
                />
              )}
            />

            <div className="bg-cal-muted rounded-xl p-1">
              <div className="flex items-center justify-between p-2">
                <Label className="text-emphasis mb-0 text-sm font-medium leading-none">{t("advanced")}</Label>
                <Switch size="sm" checked={showAdvancedFields} onCheckedChange={setShowAdvancedFields} />
              </div>

              {showAdvancedFields && (
                <div className="bg-default stack-y-5 rounded-lg p-4">
                  <Controller
                    name="sipTrunkAuthUsername"
                    control={phoneNumberForm.control}
                    render={({ field: { value } }) => (
                      <TextField
                        name="sipTrunkAuthUsername"
                        label={
                          <span className="flex items-center gap-1">
                            {t("sip_trunk_username")}
                            <Tooltip content={t("sip_trunk_username_info_tooltip")}>
                              <Icon name="info" className="text-muted h-4 w-4 cursor-pointer" />
                            </Tooltip>
                          </span>
                        }
                        value={value}
                        type="text"
                        onChange={(e) => {
                          phoneNumberForm.setValue("sipTrunkAuthUsername", e?.target.value, {
                            shouldDirty: true,
                          });
                        }}
                      />
                    )}
                  />

                  <Controller
                    name="sipTrunkAuthPassword"
                    control={phoneNumberForm.control}
                    render={({ field: { value } }) => (
                      <TextField
                        name="sipTrunkAuthPassword"
                        label={
                          <span className="flex items-center gap-1">
                            {t("sip_trunk_password")}
                            <Tooltip content={t("sip_trunk_password_info_tooltip")}>
                              <Icon name="info" className="text-muted h-4 w-4 cursor-pointer" />
                            </Tooltip>
                          </span>
                        }
                        value={value}
                        type="password"
                        onChange={(e) => {
                          phoneNumberForm.setValue("sipTrunkAuthPassword", e?.target.value, {
                            shouldDirty: true,
                          });
                        }}
                      />
                    )}
                  />

                  <Controller
                    name="nickname"
                    control={phoneNumberForm.control}
                    render={({ field: { value } }) => (
                      <TextField
                        name="nickname"
                        label={
                          <span className="flex items-center gap-1">
                            {t("nickname")}
                            <Tooltip content={t("nickname_info_tooltip")}>
                              <Icon name="info" className="text-muted h-4 w-4 cursor-pointer" />
                            </Tooltip>
                          </span>
                        }
                        value={value}
                        type="text"
                        onChange={(e) => {
                          phoneNumberForm.setValue("nickname", e?.target.value, { shouldDirty: true });
                        }}
                      />
                    )}
                  />
                </div>
              )}
            </div>

            {/* Having trouble importing section */}
            <div className="rounded-lg border p-2">
              <div className="flex items-start gap-3">
                <Icon name="info" className="text-subtle mt-0.5 h-5 w-5 shrink-0" />
                <div className="flex-1">
                  <p className="text-emphasis text-sm font-medium">{t("having_trouble_importing")}</p>
                  <p className="text-subtle mt-1 text-sm leading-tight">
                    {t("learn_how_to_get_your_terminator")}
                  </p>
                </div>
                <Button
                  type="button"
                  color="secondary"
                  size="base"
                  EndIcon="external-link"
                  href="https://cal.com/help/importing/import-numbers"
                  target="_blank"
                  className="text-emphasis my-auto">
                  {t("learn")}
                </Button>
              </div>
            </div>
          </div>

          <BaseDialogFooter showDivider className="relative">
            <Button onClick={() => onOpenChange(false)} color="secondary">
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              loading={importNumberMutation.isPending}
              disabled={importNumberMutation.isPending}>
              {t("create")}
            </Button>
          </BaseDialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
