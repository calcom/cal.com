import { EventTypeSetupInfered, FormValues } from "pages/v2/event-types/[type]";
import React, { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Controller } from "react-hook-form";
import { FormattedNumber, IntlProvider } from "react-intl";

import { SelectGifInput } from "@calcom/app-store/giphy/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon } from "@calcom/ui";
import { Alert, Button, EmptyScreen, Select, Switch, TextField } from "@calcom/ui/v2";

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
  description: React.ReactNode;
  switchChecked?: boolean;
  switchOnClick?: (e: boolean) => void;
  children?: React.ReactNode;
}) => {
  return (
    <div className="mb-4 rounded-md border border-gray-200 p-8">
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
  currency,
  eventType,
  hasGiphyIntegration,
}: Pick<
  EventTypeSetupInfered,
  "eventType" | "hasPaymentIntegration" | "hasGiphyIntegration" | "currency"
>) => {
  const formMethods = useFormContext<FormValues>();
  const [showGifSelection, setShowGifSelection] = useState(
    hasGiphyIntegration && !!eventType.metadata["giphyThankYouPage"]
  );
  const [requirePayment, setRequirePayment] = useState(eventType.price > 0);
  const recurringEventDefined = eventType.recurringEvent?.count !== undefined;

  const getCurrencySymbol = (locale: string, currency: string) =>
    (0)
      .toLocaleString(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
      .replace(/\d/g, "")
      .trim();

  const { t } = useLocale();

  const installedApps = [hasPaymentIntegration, hasGiphyIntegration].filter(Boolean).length;

  if (installedApps === 0) {
    return (
      <EmptyScreen
        Icon={Icon.FiGrid}
        headline={t("empty_installed_apps_headline")}
        description={t("empty_installed_apps_description")}
        buttonRaw={
          <Button target="_blank" href="/apps">
            {t("empty_installed_apps_button")}{" "}
          </Button>
        }
      />
    );
  }
  return (
    <div className="pt-4 before:border-0">
      {/* TODO:Strip isnt fully setup yet  */}
      {hasPaymentIntegration && (
        <AppCard
          name="Stripe"
          switchChecked={requirePayment}
          switchOnClick={(e) => {
            if (!e) {
              formMethods.setValue("price", 0);
              setRequirePayment(false);
            } else {
              setRequirePayment(true);
            }
          }}
          description={
            <>
              <div className="">
                {t("require_payment")} (0.5% +{" "}
                <IntlProvider locale="en">
                  <FormattedNumber value={0.1} style="currency" currency={currency} />
                </IntlProvider>{" "}
                {t("commission_per_transaction")})
              </div>
            </>
          }
          logo="/api/app-store/stripepayment/icon.svg">
          <>
            {recurringEventDefined ? (
              <Alert severity="warning" title={t("warning_recurring_event_payment")} />
            ) : (
              requirePayment && (
                <div className="block items-center sm:flex">
                  <Controller
                    defaultValue={eventType.price}
                    control={formMethods.control}
                    name="price"
                    render={({ field }) => (
                      <TextField
                        label=""
                        addOnLeading={<>{getCurrencySymbol("en", currency)}</>}
                        {...field}
                        step="0.01"
                        min="0.5"
                        type="number"
                        required
                        className="block w-full rounded-sm border-gray-300 pl-2 pr-12 text-sm"
                        placeholder="Price"
                        onChange={(e) => {
                          field.onChange(e.target.valueAsNumber * 100);
                        }}
                        value={field.value > 0 ? field.value / 100 : undefined}
                      />
                    )}
                  />
                </div>
              )
            )}
          </>
        </AppCard>
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
              defaultValue={eventType.metadata["giphyThankYouPage"] as string}
              onChange={(url: string) => {
                formMethods.setValue("giphyThankYouPage", url);
              }}
            />
          )}
        </AppCard>
      )}
    </div>
  );
};
