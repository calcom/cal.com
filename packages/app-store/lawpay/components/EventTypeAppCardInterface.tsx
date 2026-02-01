import { useEffect, useState } from "react";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { TextField, Select, Label } from "@calcom/ui";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({
  app,
  eventType,
  getAppData,
  setAppData,
}) {
  const price = getAppData("price");
  const currency = getAppData("currency", "usd");
  const paymentOption = getAppData("paymentOption", "ON_BOOKING");
  const accountType = getAppData("accountType", "operating");
  const [selectedCurrency, setSelectedCurrency] = useState(currency);
  const [selectedAccountType, setSelectedAccountType] = useState(accountType);

  useEffect(() => {
    if (currency) {
      setSelectedCurrency(currency);
    }
  }, [currency]);

  useEffect(() => {
    if (accountType) {
      setSelectedAccountType(accountType);
    }
  }, [accountType]);

  return (
    <>
      <div className="mt-2 block items-center sm:flex">
        <TextField
          type="number"
          step="0.01"
          min="0.5"
          placeholder="Price"
          label="Price"
          onChange={(e) => {
            setAppData("price", Number(e.target.value));
          }}
          value={price}
        />
      </div>
      <div className="mt-4 block items-center sm:flex">
        <div className="w-full">
          <Label>Currency</Label>
          <Select
            defaultValue={
              selectedCurrency
                ? { value: selectedCurrency, label: selectedCurrency.toUpperCase() }
                : { value: "usd", label: "USD" }
            }
            options={[
              { value: "usd", label: "USD" },
              { value: "eur", label: "EUR" },
              { value: "gbp", label: "GBP" },
              { value: "cad", label: "CAD" },
            ]}
            onChange={(e) => {
              if (e?.value) {
                setSelectedCurrency(e.value);
                setAppData("currency", e.value);
              }
            }}
          />
        </div>
      </div>
      <div className="mt-4 block items-center sm:flex">
        <div className="w-full">
          <Label>Account Type</Label>
          <Select
            defaultValue={
              selectedAccountType
                ? {
                    value: selectedAccountType,
                    label: selectedAccountType === "operating" ? "Operating Account" : "Trust Account (IOLTA)",
                  }
                : { value: "operating", label: "Operating Account" }
            }
            options={[
              { value: "operating", label: "Operating Account" },
              { value: "trust", label: "Trust Account (IOLTA)" },
            ]}
            onChange={(e) => {
              if (e?.value) {
                setSelectedAccountType(e.value);
                setAppData("accountType", e.value);
              }
            }}
          />
          <p className="text-subtle mt-2 text-sm">
            {selectedAccountType === "trust"
              ? "Trust account payments comply with IOLTA regulations and attorney trust accounting rules."
              : "Operating account for general business payments like retainers and flat fees."}
          </p>
        </div>
      </div>
      <div className="mt-4 block items-center sm:flex">
        <div className="w-full">
          <Label>Payment Timing</Label>
          <Select
            defaultValue={{ value: paymentOption, label: "On Booking" }}
            options={[{ value: "ON_BOOKING", label: "On Booking" }]}
            onChange={(e) => {
              if (e?.value) {
                setAppData("paymentOption", e.value);
              }
            }}
          />
        </div>
      </div>
    </>
  );
};

export default EventTypeAppCard;
