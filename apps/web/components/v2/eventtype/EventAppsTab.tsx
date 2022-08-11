import { EventTypeSetupInfered, FormValues } from "pages/v2/event-types/[type]";
import React, { useState } from "react";
import { useFormContext } from "react-hook-form";

import { SelectGifInput } from "@calcom/app-store/giphy/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Switch } from "@calcom/ui/v2";

const AppCard = ({
  logo,
  name,
  description,
  switchOnClick,
  switchChecked,
  children,
}: {
  logo: string;
  name: string;
  description: string;
  switchChecked?: boolean;
  switchOnClick?: (e: boolean) => void;
  children?: React.ReactNode;
}) => {
  return (
    <div className="rounded-md border border-gray-200 p-8">
      <div className="flex w-full">
        <img src={logo} alt={name} className="mr-3 h-auto w-[42px] rounded-sm" />
        <div className="flex flex-col">
          <span className="font-semibold leading-none text-black">{name}</span>
          <p className="pt-2 text-sm font-normal text-gray-600">{description}</p>
        </div>
        <div className="ml-auto">
          <Switch onCheckedChange={switchOnClick} checked={switchChecked} />
        </div>
      </div>
      <hr className="my-6" />
      {children}
    </div>
  );
};

export const EventAppsTab = ({
  hasPaymentIntegration,
  eventType,
  hasGiphyIntegration,
}: Pick<EventTypeSetupInfered, "eventType" | "hasPaymentIntegration" | "hasGiphyIntegration">) => {
  const formMethods = useFormContext<FormValues>();
  const [showGifSelection, setShowGifSelection] = useState(hasGiphyIntegration);
  const { t } = useLocale();

  return (
    <div className="before:border-0">
      {/* TODO:Strip isnt fully setup yet  */}
      {hasPaymentIntegration && (
        <AppCard name="stripe" description={t("stripe_description")} logo="api/app-store/stripe/logo" />
      )}
      {hasGiphyIntegration && (
        <AppCard
          name="Giphy"
          description={t("confirmation_page_gif")}
          logo="/api/app-store/giphy/icon.svg"
          switchOnClick={(e) => {
            if (!e) {
              setShowGifSelection(false);
              formMethods.setValue("giphyThankYouPage", "");
            } else {
              setShowGifSelection(true);
            }
          }}
          switchChecked={showGifSelection}>
          {showGifSelection && (
            <SelectGifInput
              defaultValue={formMethods.getValues("giphyThankYouPage") as string}
              onChange={(url) => {
                formMethods.setValue("giphyThankYouPage", url);
              }}
            />
          )}
        </AppCard>
      )}
    </div>
  );
};
