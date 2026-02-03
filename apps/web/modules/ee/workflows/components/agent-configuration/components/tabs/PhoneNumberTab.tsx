"use client";

import posthog from "posthog-js";
import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";

import type { FormValues } from "@calcom/features/ee/workflows/lib/types";
import { CAL_AI_PHONE_NUMBER_MONTHLY_PRICE } from "@calcom/lib/constants";
import { formatPhoneNumber } from "@calcom/lib/formatPhoneNumber";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";
import { WebCallDialog } from "@calcom/web/modules/ee/workflows/components/WebCallDialog";

import { TestPhoneCallDialog } from "../../../TestPhoneCallDialog";
import { usePhoneNumberActions } from "../../hooks/usePhoneNumberActions";
import { BuyNumberDialog } from "../dialogs/BuyNumberDialog";
import { ConfirmationDialogs } from "../dialogs/ConfirmationDialogs";
import { ImportNumberDialog } from "../dialogs/ImportNumberDialog";

interface PhoneNumberTabProps {
  agentData?: RouterOutputs["viewer"]["aiVoiceAgent"]["get"];
  readOnly?: boolean;
  agentId?: string | null;
  teamId?: number;
  workflowId?: string;
  isOrganization?: boolean;
  form?: UseFormReturn<FormValues>;
  eventTypeIds?: number[];
}

export function PhoneNumberTab({
  agentData,
  readOnly = false,
  agentId,
  teamId,
  workflowId,
  isOrganization = false,
  form,
  eventTypeIds = [],
}: PhoneNumberTabProps) {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const [isBuyDialogOpen, setIsBuyDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [isTestAgentDialogOpen, setIsTestAgentDialogOpen] = useState(false);
  const [isWebCallDialogOpen, setIsWebCallDialogOpen] = useState(false);

  const phoneNumberActions = usePhoneNumberActions();

  const buyNumberMutation = trpc.viewer.phoneNumber.buy.useMutation({
    onSuccess: async (data: { checkoutUrl?: string; message?: string; phoneNumber?: unknown }) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (data.phoneNumber) {
        showToast(t("phone_number_purchased_successfully"), "success");
        await utils.viewer.me.get.invalidate();
        setIsBuyDialogOpen(false);
        if (agentId) {
          utils.viewer.aiVoiceAgent.get.invalidate({ id: agentId });
        }
      } else {
        showToast(data.message || t("something_went_wrong"), "error");
      }
    },
    onError: (error: { message: string }) => {
      showToast(error.message, "error");
    },
  });

  const importNumberMutation = trpc.viewer.phoneNumber.import.useMutation({
    onSuccess: async () => {
      showToast(t("phone_number_imported_successfully"), "success");
      setIsImportDialogOpen(false);

      await utils.viewer.me.get.invalidate();
      if (agentId) {
        await utils.viewer.aiVoiceAgent.get.invalidate({ id: agentId });
      }
    },
    onError: (error: { message: string }) => {
      showToast(error.message, "error");
    },
  });

  const updateAgentMutation = trpc.viewer.aiVoiceAgent.update.useMutation({
    onSuccess: async () => {
      if (agentId) {
        await utils.viewer.aiVoiceAgent.get.invalidate({ id: agentId });
      }
    },
    onError: (error: { message: string }) => {
      showToast(error.message, "error");
    },
  });

  const hasActivePhoneNumbers =
    agentData?.outboundPhoneNumbers &&
    agentData.outboundPhoneNumbers.filter(
      (phone) =>
        phone.subscriptionStatus === PhoneNumberSubscriptionStatus.ACTIVE || !phone.subscriptionStatus
    ).length > 0;

  const outboundEventTypeId =
    form?.watch("trigger") === "FORM_SUBMITTED" ? agentData?.outboundEventTypeId : null;

  if (hasActivePhoneNumbers) {
    const activePhoneNumbers = agentData.outboundPhoneNumbers.filter(
      (phone) =>
        phone.subscriptionStatus === PhoneNumberSubscriptionStatus.ACTIVE || !phone.subscriptionStatus
    );
    const phoneNumber = activePhoneNumbers[0];

    return (
      <>
        <div className="stack-y-2 relative">
          {updateAgentMutation.isPending && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/50">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Icon name="loader" className="h-4 w-4 animate-spin" />
                {t("updating")}...
              </div>
            </div>
          )}
          <div className="border-subtle rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-emphasis text-sm">{formatPhoneNumber(phoneNumber.phoneNumber)}</span>
                  <Badge variant="green" size="md" withDot>
                    {t("active")}
                  </Badge>
                  {phoneNumber.subscriptionStatus && (
                    <span className="text-muted text-xs">
                      {t("phone_number_cost", {
                        price: CAL_AI_PHONE_NUMBER_MONTHLY_PRICE,
                      })}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Dropdown>
                  <DropdownMenuTrigger asChild>
                    <Button
                      color="secondary"
                      className="rounded-[10px]"
                      disabled={readOnly}
                      EndIcon="chevron-down">
                      {t("test_agent")}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>
                      <DropdownItem
                        type="button"
                        StartIcon="phone"
                        onClick={() => {
                          setIsTestAgentDialogOpen(true);
                        }}>
                        {t("phone_call")}
                      </DropdownItem>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <DropdownItem
                        type="button"
                        StartIcon="monitor"
                        onClick={() => {
                          setIsWebCallDialogOpen(true);
                        }}>
                        {t("web_call")}
                      </DropdownItem>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </Dropdown>
                {!readOnly && (
                  <Dropdown>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" color="secondary" variant="icon" StartIcon="ellipsis" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem>
                        <DropdownItem
                          type="button"
                          StartIcon="trash"
                          color="destructive"
                          onClick={() => {
                            if (readOnly) return;
                            if (phoneNumber.subscriptionStatus === PhoneNumberSubscriptionStatus.ACTIVE) {
                              phoneNumberActions.handleCancelSubscription(phoneNumber.id);
                            } else {
                              phoneNumberActions.handleDeletePhoneNumber(phoneNumber.phoneNumber);
                            }
                          }}>
                          {phoneNumber.subscriptionStatus === PhoneNumberSubscriptionStatus.ACTIVE
                            ? t("unsubscribe")
                            : t("delete")}
                        </DropdownItem>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </Dropdown>
                )}
              </div>
            </div>
          </div>
        </div>

        <BuyNumberDialog
          open={isBuyDialogOpen}
          onOpenChange={setIsBuyDialogOpen}
          agentId={agentId}
          workflowId={workflowId}
          teamId={teamId}
        />

        <ImportNumberDialog
          open={isImportDialogOpen}
          onOpenChange={setIsImportDialogOpen}
          phoneNumberForm={phoneNumberActions.phoneNumberForm}
          showAdvancedFields={showAdvancedFields}
          setShowAdvancedFields={setShowAdvancedFields}
          agentId={agentId}
          workflowId={workflowId}
          teamId={teamId}
        />

        {agentId && form && (
          <TestPhoneCallDialog
            open={isTestAgentDialogOpen}
            onOpenChange={setIsTestAgentDialogOpen}
            agentId={agentId}
            teamId={teamId}
            form={form}
            eventTypeIds={eventTypeIds}
            outboundEventTypeId={outboundEventTypeId}
          />
        )}

        {agentId && form && (
          <WebCallDialog
            open={isWebCallDialogOpen}
            onOpenChange={setIsWebCallDialogOpen}
            agentId={agentId}
            teamId={teamId}
            isOrganization={isOrganization}
            form={form}
            eventTypeIds={eventTypeIds}
            outboundEventTypeId={outboundEventTypeId}
          />
        )}

        <ConfirmationDialogs
          cancellingNumberId={phoneNumberActions.cancellingNumberId}
          setCancellingNumberId={phoneNumberActions.setCancellingNumberId}
          numberToDelete={phoneNumberActions.numberToDelete}
          setNumberToDelete={phoneNumberActions.setNumberToDelete}
          agentId={agentId}
        />
      </>
    );
  }

  return (
    <>
      <div className="border-subtle rounded-xl border p-8">
        <div className="stack-y-6 flex flex-col items-center text-center">
          <div className="bg-cal-muted flex h-16 w-16 items-center justify-center rounded-lg">
            <Icon name="phone" className="text-subtle h-8 w-8" />
          </div>
          <div className="stack-y-2">
            <h3 className="text-emphasis text-lg font-semibold">{t("no_phone_numbers")}</h3>
            <p className="text-subtle text-sm">{t("buy_a_phone_number_or_import_one_you_already_have")}</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => {
                if (readOnly) return;
                posthog.capture("calai_buy_number_modal_opened");
                setIsBuyDialogOpen(true);
              }}
              StartIcon="external-link"
              className="px-6"
              disabled={readOnly || buyNumberMutation.isPending}>
              {t("buy")}
            </Button>
            <Button
              onClick={() => {
                if (readOnly) return;
                setIsImportDialogOpen(true);
              }}
              color="secondary"
              className="px-6"
              disabled={readOnly || importNumberMutation.isPending}>
              {t("import")}
            </Button>
          </div>
        </div>
      </div>

      <BuyNumberDialog
        open={isBuyDialogOpen}
        onOpenChange={setIsBuyDialogOpen}
        agentId={agentId}
        workflowId={workflowId}
        teamId={teamId}
      />

      <ImportNumberDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        phoneNumberForm={phoneNumberActions.phoneNumberForm}
        showAdvancedFields={showAdvancedFields}
        setShowAdvancedFields={setShowAdvancedFields}
        agentId={agentId}
        workflowId={workflowId}
        teamId={teamId}
      />

      {agentId && form && (
        <TestPhoneCallDialog
          open={isTestAgentDialogOpen}
          onOpenChange={setIsTestAgentDialogOpen}
          agentId={agentId}
          teamId={teamId}
          form={form}
          eventTypeIds={eventTypeIds}
          outboundEventTypeId={outboundEventTypeId}
        />
      )}

      {agentId && form && (
        <WebCallDialog
          open={isWebCallDialogOpen}
          onOpenChange={setIsWebCallDialogOpen}
          agentId={agentId}
          teamId={teamId}
          isOrganization={isOrganization}
          form={form}
          eventTypeIds={eventTypeIds}
          outboundEventTypeId={outboundEventTypeId}
        />
      )}

      <ConfirmationDialogs
        cancellingNumberId={phoneNumberActions.cancellingNumberId}
        setCancellingNumberId={phoneNumberActions.setCancellingNumberId}
        numberToDelete={phoneNumberActions.numberToDelete}
        setNumberToDelete={phoneNumberActions.setNumberToDelete}
        agentId={agentId}
      />
    </>
  );
}
