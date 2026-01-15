"use client";

import { useState, useEffect } from "react";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Button } from "@calcom/ui/components/button";
import { Badge } from "@calcom/ui/components/badge";
import { FormCard, FormCardBody } from "@calcom/ui/components/card";
import { Input, SelectField, Switch, CheckboxField } from "@calcom/ui/components/form";
import { Alert } from "@calcom/ui/components/alert";
import { Tooltip } from "@calcom/ui/components/tooltip";
import { SkeletonText } from "@calcom/ui/components/skeleton";
import { Icon } from "@calcom/ui/components/icon";

interface ExchangeRate {
  rate: number;
  timestamp: string;
}

export function MateuszContent() {
  const { t } = useLocale();
  const [counter, setCounter] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [selectValue, setSelectValue] = useState({ value: "option1", label: "Option 1" });
  const [switchChecked, setSwitchChecked] = useState(false);
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);

  const fetchExchangeRate = async () => {
    setIsLoadingRate(true);
    try {
      // Using a free exchange rate API (exchangerate-api.com)
      const response = await fetch("https://api.exchangerate-api.com/v4/latest/USD", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const rate = data.rates?.PLN || 4.0; // Fallback to 4.0 if API fails
      setExchangeRate({
        rate: rate,
        timestamp: new Date().toLocaleString(),
      });
      setAlertVisible(true);
      setTimeout(() => setAlertVisible(false), 5000);
    } catch (error) {
      // Fallback to mock rate if API fails
      console.error("Failed to fetch exchange rate:", error);
      setExchangeRate({
        rate: 4.0,
        timestamp: new Date().toLocaleString() + " (fallback)",
      });
      setAlertVisible(true);
      setTimeout(() => setAlertVisible(false), 3000);
    } finally {
      setIsLoadingRate(false);
    }
  };

  useEffect(() => {
    // Load rate on mount
    fetchExchangeRate();
  }, []);

  const selectOptions = [
    { value: "option1", label: "Option 1" },
    { value: "option2", label: "Option 2" },
    { value: "option3", label: "Option 3" },
  ];

  return (
    <div className="space-y-6">
      {/* Alert */}
      {alertVisible && (
        <Alert
          severity="neutral"
          title="Exchange Rate Updated"
          message={`USD/PLN rate updated: ${exchangeRate?.rate.toFixed(4)}`}
        />
      )}

      {/* Counter Section */}
      <FormCard label="Counter Component" leftIcon="bar-chart-2">
        <FormCardBody>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="icon"
                color="destructive"
                StartIcon="chevron-down"
                onClick={() => setCounter((prev) => prev - 1)}
                aria-label="Decrease"
              />
              <div className="flex min-w-[120px] items-center justify-center">
                <span className="text-emphasis text-3xl font-bold">{counter}</span>
              </div>
              <Button
                variant="icon"
                color="secondary"
                StartIcon="plus"
                onClick={() => setCounter((prev) => prev + 1)}
                aria-label="Increase"
              />
            </div>
            <Button variant="icon" color="minimal" StartIcon="rotate-cw" onClick={() => setCounter(0)}>
              Reset
            </Button>
          </div>
        </FormCardBody>
      </FormCard>

      {/* Exchange Rate Section */}
      <FormCard label="USD/PLN Exchange Rate" leftIcon="dollar-sign" badge={{ text: "Live", variant: "green" }}>
        <FormCardBody>
          <div className="space-y-4">
            {isLoadingRate ? (
              <div className="space-y-2">
                <SkeletonText className="h-8 w-32" />
                <SkeletonText className="h-4 w-48" />
              </div>
            ) : exchangeRate ? (
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-emphasis text-4xl font-bold">{exchangeRate.rate.toFixed(4)}</span>
                  <Badge variant="green">PLN</Badge>
                </div>
                <p className="text-subtle text-sm">Last updated: {exchangeRate.timestamp}</p>
              </div>
            ) : (
              <p className="text-muted">No data available</p>
            )}
            <Button StartIcon="refresh-cw" onClick={fetchExchangeRate} disabled={isLoadingRate}>
              {isLoadingRate ? "Loading..." : "Refresh Rate"}
            </Button>
          </div>
        </FormCardBody>
      </FormCard>

      {/* Form Elements Section */}
      <FormCard label="Form Elements" leftIcon="edit-3">
        <FormCardBody className="space-y-4">
          {/* Input Field */}
          <div>
            <label className="text-emphasis mb-1 block text-sm font-medium">Text Input</label>
            <Input
              type="text"
              placeholder="Enter some text..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            {inputValue && (
              <p className="text-subtle mt-1 text-sm">You typed: {inputValue}</p>
            )}
          </div>

          {/* Select Field */}
          <div>
            <label className="text-emphasis mb-1 block text-sm font-medium">Select Dropdown</label>
            <SelectField
              value={selectValue}
              options={selectOptions}
              onChange={(option) => {
                if (option && !(option instanceof Array)) {
                  setSelectValue(option);
                }
              }}
            />
          </div>

          {/* Switch */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-emphasis block text-sm font-medium">Toggle Switch</label>
              <p className="text-subtle text-sm">{switchChecked ? "Enabled" : "Disabled"}</p>
            </div>
            <Switch checked={switchChecked} onCheckedChange={setSwitchChecked} />
          </div>

          {/* Checkbox */}
          <div className="flex items-center gap-2">
            <CheckboxField
              description="Check this box to agree"
              checked={checkboxChecked}
              onChange={(event) => {
                setCheckboxChecked(event.target.checked);
              }}
            />
          </div>
        </FormCardBody>
      </FormCard>

      {/* Button Variants Section */}
      <FormCard label="Button Variants" leftIcon="mouse-pointer">
        <FormCardBody>
          <div className="flex flex-wrap gap-2">
            <Button color="primary">Primary</Button>
            <Button color="secondary">Secondary</Button>
            <Button color="destructive">Destructive</Button>
            <Button color="minimal">Minimal</Button>
            <Button variant="icon" StartIcon="star" />
            <Button variant="fab" StartIcon="plus" size="sm">
              FAB
            </Button>
            <Button StartIcon="external-link" target="_blank" href="https://cal.com">
              Link Button
            </Button>
          </div>
        </FormCardBody>
      </FormCard>

      {/* Badges Section */}
      <FormCard label="Badge Variants" leftIcon="tag">
        <FormCardBody>
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">Default</Badge>
            <Badge variant="green">Success</Badge>
            <Badge variant="orange">Warning</Badge>
            <Badge variant="red">Error</Badge>
            <Badge variant="gray">Info</Badge>
          </div>
        </FormCardBody>
      </FormCard>

      {/* Tooltips Section */}
      <FormCard label="Tooltip Examples" leftIcon="info">
        <FormCardBody>
          <div className="flex gap-4">
            <Tooltip content="This is a helpful tooltip">
              <Button>Hover me</Button>
            </Tooltip>
            <Tooltip content="Icon with tooltip">
              <Icon name="help-circle" className="h-5 w-5" />
            </Tooltip>
          </div>
        </FormCardBody>
      </FormCard>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <FormCard label="Status Card 1" leftIcon="check-circle-2">
          <FormCardBody>
            <p className="text-subtle">This is a status card with icon and content area.</p>
          </FormCardBody>
        </FormCard>

        <FormCard label="Status Card 2" leftIcon="x-circle">
          <FormCardBody>
            <p className="text-subtle">Another status card demonstrating grid layout.</p>
          </FormCardBody>
        </FormCard>
      </div>

      {/* Action Section */}
      <FormCard label="Actions" leftIcon="zap">
        <FormCardBody>
          <div className="flex flex-wrap gap-2">
            <Button StartIcon="download" variant="icon" color="secondary">
              Download
            </Button>
            <Button StartIcon="upload" variant="icon" color="secondary">
              Upload
            </Button>
            <Button StartIcon="copy" variant="icon" color="minimal">
              Copy
            </Button>
            <Button StartIcon="trash-2" variant="icon" color="destructive">
              Delete
            </Button>
          </div>
        </FormCardBody>
      </FormCard>
    </div>
  );
}
