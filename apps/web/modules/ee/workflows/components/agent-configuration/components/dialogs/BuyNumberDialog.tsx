"use client";

import { CAL_AI_PHONE_NUMBER_MONTHLY_PRICE } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import {
  DialogFooter as BaseDialogFooter,
  Dialog,
  DialogContent,
  DialogHeader,
} from "@calcom/ui/components/dialog";
import { Label } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import posthog from "posthog-js";

interface BuyNumberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId?: string | null;
  workflowId?: string;
  teamId?: number;
}

export function BuyNumberDialog({ open, onOpenChange, agentId, workflowId, teamId }: BuyNumberDialogProps) {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const buyNumberMutation = trpc.viewer.phoneNumber.buy.useMutation({
    onSuccess: async (data: { checkoutUrl?: string; message?: string; phoneNumber?: unknown }) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (data.phoneNumber) {
        showToast(t("phone_number_purchased_successfully"), "success");
        posthog.capture("calai_phone_number_purchased");
        await utils.viewer.me.get.invalidate();
        onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent type="creation">
        <DialogHeader
          title={t("buy_a_new_number")}
          subtitle={t("buy_number_for_x_per_month", {
            priceInDollars: CAL_AI_PHONE_NUMBER_MONTHLY_PRICE,
          })}
        />
        <div className="flex flex-col">
          <div>
            <div>
              <Alert
                className="mb-4"
                severity="info"
                message={t("only_us_phone_numbers_can_be_purchased_here")}
              />
              <Label>{t("supported_call_destinations")}</Label>
              <div className="-mb-4 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🇺🇸</span>
                  <span className="text-default">United States</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🇮🇳</span>
                  <span className="text-default">India</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🇦🇺</span>
                  <span className="text-default">Australia</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🇩🇪</span>
                  <span className="text-default">Germany</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🇪🇸</span>
                  <span className="text-default">Spain</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🇬🇧</span>
                  <span className="text-default">United Kingdom</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🇲🇽</span>
                  <span className="text-default">Mexico</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🇫🇷</span>
                  <span className="text-default">France</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🇯🇵</span>
                  <span className="text-default">Japan</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🇨🇦</span>
                  <span className="text-default">Canada</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🇮🇹</span>
                  <span className="text-default">Italy</span>
                </div>
              </div>
            </div>
          </div>
          <BaseDialogFooter showDivider className="relative">
            <Button onClick={() => onOpenChange(false)} color="secondary">
              {t("close")}
            </Button>
            <Button
              StartIcon="external-link"
              onClick={() => {
                if (!agentId || !workflowId) {
                  return;
                }
                posthog.capture("calai_buy_number_button_clicked", { agentId, workflowId, teamId });
                buyNumberMutation.mutate({
                  agentId: agentId,
                  workflowId: workflowId,
                  teamId: teamId ?? undefined,
                });
              }}
              loading={buyNumberMutation.isPending}
              disabled={buyNumberMutation.isPending}>
              {t("buy_us_number_button", { priceInDollars: CAL_AI_PHONE_NUMBER_MONTHLY_PRICE })}
            </Button>
          </BaseDialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
