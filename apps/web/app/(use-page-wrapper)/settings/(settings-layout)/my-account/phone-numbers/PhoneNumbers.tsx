"use client";

import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@calcom/ui/components/card";
import { NumberInput } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { ShellMain } from "@calcom/ui/components/shell";
import { showToast } from "@calcom/ui/components/toast";

export function PhoneNumbers() {
  const { t } = useLocale();
  const [areaCode, setAreaCode] = useState<number | undefined>();
  const utils = trpc.useContext();

  const { data: numbers, isLoading: isLoadingNumbers } = trpc.viewer.phoneNumbers.list.useQuery();

  const buyNumberMutation = trpc.viewer.phoneNumbers.buy.useMutation({
    onSuccess: () => {
      showToast(t("phone_number_purchased_successfully"), "success");
      utils.viewer.phoneNumbers.list.invalidate();
      setAreaCode(undefined);
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  return (
    <ShellMain>
      <Card>
        <CardHeader>
          <CardTitle>{t("phone_numbers")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-emphasis text-lg font-semibold">{t("your_phone_numbers")}</h3>
            </div>
            {isLoadingNumbers && <p>{t("loading")}</p>}
            {numbers && numbers.length > 0 ? (
              <ul className="divide-subtle divide-y">
                {numbers.map((number) => (
                  <li key={number.id} className="flex items-center justify-between py-4">
                    <div className="flex items-center">
                      <Icon name="phone" className="h-6 w-6 text-gray-400" />
                      <span className="ml-4 text-sm font-medium">{number.phoneNumber}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              !isLoadingNumbers && <p>{t("no_phone_numbers_yet")}</p>
            )}

            <div className="mt-8">
              <h3 className="text-emphasis mb-4 text-lg font-semibold">{t("buy_new_number")}</h3>
              <div className="flex items-end space-x-2">
                <NumberInput
                  label={t("area_code_optional")}
                  placeholder="e.g. 415"
                  value={areaCode}
                  onValueChange={(value) => setAreaCode(value.intValue)}
                />
                <Button
                  onClick={() => buyNumberMutation.mutate({ areaCode })}
                  loading={buyNumberMutation.isPending}>
                  {t("buy_number")} (50 {t("credits")})
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </ShellMain>
  );
}
