"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { formatPhoneNumber } from "@calcom/lib/formatPhoneNumber";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { DialogContent } from "@calcom/ui/components/dialog";
import { DialogFooter } from "@calcom/ui/components/dialog";
import { ConfirmationDialogContent } from "@calcom/ui/components/dialog";
import { Dialog as UIDialog } from "@calcom/ui/components/dialog";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { Icon } from "@calcom/ui/components/icon";
import { SkeletonButton, SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";

const SkeletonLoader = () => {
  return (
    <SkeletonContainer>
      <div className="border-subtle space-y-6 rounded-b-xl border border-t-0 px-4 py-8 sm:px-6">
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
        <SkeletonButton className="ml-auto h-8 w-20 rounded-md p-5" />
      </div>
    </SkeletonContainer>
  );
};

function PhoneNumbersView({
  numbers = [],
  revalidatePage,
}: {
  numbers?: RouterOutputs["viewer"]["loggedInViewerRouter"]["list"];
  revalidatePage: () => Promise<void>;
}) {
  const { t } = useLocale();
  const [isBuyDialogOpen, setIsBuyDialogOpen] = useState(false);
  const [cancellingNumberId, setCancellingNumberId] = useState<number | null>(null);
  const utils = trpc.useUtils();
  const searchParams = useSearchParams();

  // Handle success/error messages from URL parameters
  useEffect(() => {
    const success = searchParams?.get("success");
    const error = searchParams?.get("error");
    const message = searchParams?.get("message");
    const phoneNumber = searchParams?.get("phone_number");

    if (success === "true") {
      showToast(
        phoneNumber
          ? `Phone number ${phoneNumber} purchased successfully!`
          : "Phone number purchased successfully!",
        "success"
      );
    } else if (error === "true") {
      showToast(message || "An error occurred while processing your subscription", "error");
    }
  }, [searchParams]);

  const buyNumberMutation = trpc.viewer.loggedInViewerRouter.buy.useMutation({
    onSuccess: async (data: { checkoutUrl?: string; message?: string; phoneNumber?: any }) => {
      if (data.checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = data.checkoutUrl;
      } else if (data.phoneNumber) {
        // Phone number created directly (shouldn't happen with current implementation)
        showToast(t("phone_number_purchased_successfully"), "success");
        await utils.viewer.loggedInViewerRouter.list.invalidate();
        await utils.viewer.me.get.invalidate();
        await revalidatePage();
        setIsBuyDialogOpen(false);
      } else {
        showToast(data.message || "Something went wrong", "error");
      }
    },
    onError: (error: { message: string }) => {
      console.log("error", error);
      showToast(error.message, "error");
    },
  });

  const cancelSubscriptionMutation = trpc.viewer.loggedInViewerRouter.cancel.useMutation({
    onSuccess: async (data: { message?: string }) => {
      showToast(data.message || "Phone number subscription cancelled successfully", "success");
      await utils.viewer.loggedInViewerRouter.list.invalidate();
      await utils.viewer.me.get.invalidate();
      await revalidatePage();
      setCancellingNumberId(null);
    },
    onError: (error: { message: string }) => {
      console.log("error", error);
      showToast(error.message, "error");
      setCancellingNumberId(null);
    },
  });

  const BuyNumberButton = (props: React.ComponentProps<typeof Button>) => (
    <Button {...props} color="secondary" StartIcon="plus" onClick={() => setIsBuyDialogOpen(true)}>
      {t("buy_number")}
    </Button>
  );

  const handleCancelSubscription = (phoneNumberId: number) => {
    setCancellingNumberId(phoneNumberId);
  };

  const confirmCancelSubscription = () => {
    if (cancellingNumberId) {
      cancelSubscriptionMutation.mutate({ phoneNumberId: cancellingNumberId });
    }
  };

  return (
    <>
      <SettingsHeader
        title={t("cal_ai_phone_numbers")}
        description={t("cal_ai_phone_numbers_description")}
        CTA={<BuyNumberButton />}
        borderInShellHeader={true}>
        <div>
          {numbers.length > 0 ? (
            <div className="border-subtle rounded-b-lg border border-t-0">
              {numbers.map((number, index) => (
                <div
                  key={number.id}
                  className={`flex items-center justify-between p-6 ${
                    numbers.length !== index + 1 ? "border-subtle border-b" : ""
                  }`}>
                  <div className="flex items-center">
                    <Icon name="phone" className="h-6 w-6 text-gray-400" />
                    <span className="text-emphasis ml-4 text-sm font-medium">
                      {formatPhoneNumber(number.phoneNumber)}
                    </span>
                    <span className="text-muted ml-2 text-xs">($5/month)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      color="destructive"
                      variant="button"
                      size="sm"
                      onClick={() => handleCancelSubscription(number.id)}
                      loading={cancelSubscriptionMutation.isPending && cancellingNumberId === number.id}>
                      {t("cancel_subscription")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyScreen
              Icon="phone"
              headline={t("no_phone_numbers_yet")}
              description={t("buy_your_first_phone_number")}
              className="rounded-b-lg rounded-t-none border-t-0"
              buttonRaw={<BuyNumberButton />}
            />
          )}
        </div>
      </SettingsHeader>

      <Dialog open={isBuyDialogOpen} onOpenChange={setIsBuyDialogOpen}>
        <DialogContent type="creation">
          <div className="flex flex-col">
            <div className="mb-4">
              <h3 className="text-emphasis text-lg font-bold">{t("buy_new_number")}</h3>
              <p className="text-default text-sm">{t("buy_number_cost_5_per_month")}</p>
            </div>
            <DialogFooter showDivider className="relative">
              <Button onClick={() => setIsBuyDialogOpen(false)} color="secondary">
                {t("cancel")}
              </Button>
              <Button onClick={() => buyNumberMutation.mutate()} loading={buyNumberMutation.isPending}>
                {t("buy_number_for_5_per_month")}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <UIDialog open={cancellingNumberId !== null} onOpenChange={() => setCancellingNumberId(null)}>
        <ConfirmationDialogContent
          isPending={cancelSubscriptionMutation.isPending}
          variety="danger"
          title={t("cancel_phone_number_subscription")}
          confirmBtnText={t("yes_cancel_subscription")}
          onConfirm={confirmCancelSubscription}>
          {t("cancel_phone_number_subscription_confirmation")}
        </ConfirmationDialogContent>
      </UIDialog>
    </>
  );
}

export default function PhoneNumbersQueryView({
  cachedNumbers,
  revalidatePage,
}: {
  cachedNumbers: RouterOutputs["viewer"]["loggedInViewerRouter"]["list"];
  revalidatePage: () => Promise<void>;
}) {
  const { t } = useLocale();
  const { data: numbers, isPending } = trpc.viewer.loggedInViewerRouter.list.useQuery(undefined, {
    suspense: false,
  });

  if (isPending && !cachedNumbers) return <SkeletonLoader />;

  return <PhoneNumbersView numbers={numbers || cachedNumbers} revalidatePage={revalidatePage} />;
}
