"use client";

import { useState } from "react";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { DialogContent } from "@calcom/ui/components/dialog";
import { DialogFooter } from "@calcom/ui/components/dialog";
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
  numbers?: RouterOutputs["viewer"]["phoneNumbers"]["list"];
  revalidatePage: () => Promise<void>;
}) {
  const { t } = useLocale();
  const [isBuyDialogOpen, setIsBuyDialogOpen] = useState(false);
  const utils = trpc.useContext();

  const buyNumberMutation = trpc.viewer.phoneNumbers.buy.useMutation({
    onSuccess: async () => {
      showToast(t("phone_number_purchased_successfully"), "success");
      await utils.viewer.phoneNumbers.list.invalidate();
      await utils.viewer.me.invalidate();
      await revalidatePage();
      setIsBuyDialogOpen(false);
    },
    onError: (error) => {
      console.log("error", error);
      showToast(error.message, "error");
    },
  });

  const BuyNumberButton = (props: React.ComponentProps<typeof Button>) => (
    <Button {...props} color="secondary" StartIcon={Icon.Plus} onClick={() => setIsBuyDialogOpen(true)}>
      {t("buy_number")}
    </Button>
  );

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
                    <Icon.Phone className="h-6 w-6 text-gray-400" />
                    <span className="text-emphasis ml-4 text-sm font-medium">{number.phoneNumber}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyScreen
              Icon={Icon.Phone}
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
              <p className="text-default text-sm">{t("buy_number_cost_50_credits")}</p>
            </div>
            <DialogFooter showDivider className="relative">
              <Button onClick={() => setIsBuyDialogOpen(false)} color="secondary">
                {t("cancel")}
              </Button>
              <Button onClick={() => buyNumberMutation.mutate()} loading={buyNumberMutation.isPending}>
                {t("buy_number_with_credits")}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function PhoneNumbersQueryView({
  cachedNumbers,
  revalidatePage,
}: {
  cachedNumbers: RouterOutputs["viewer"]["phoneNumbers"]["list"];
  revalidatePage: () => Promise<void>;
}) {
  const { t } = useLocale();
  const { data: numbers, isPending } = trpc.viewer.phoneNumbers.list.useQuery(undefined, {
    suspense: false,
  });

  if (isPending && !cachedNumbers) return <SkeletonLoader />;

  return <PhoneNumbersView numbers={numbers || cachedNumbers} revalidatePage={revalidatePage} />;
}
