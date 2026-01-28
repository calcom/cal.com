import { useState, useEffect, useCallback, useMemo } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Select } from "@calcom/ui/components/form";

import type { RoutingFormOptionsProps, RoutingOption } from "./RoutingFormOptions.types";

/**
 * A common component for CRM routing form options.
 * This component provides a consistent UI for configuring routing behavior
 * across different CRM integrations (HubSpot, Salesforce, etc.).
 */
function RoutingFormOptions<T extends string = string>({
  appData,
  appDataSchema,
  route,
  setAttributeRoutingConfig,
  iconPath,
  appName,
  routingOptions,
  getInitialOption,
  onOptionChange,
  children,
}: RoutingFormOptionsProps<T>): JSX.Element | null {
  const { t } = useLocale();

  const memoizedOptions = useMemo(() => routingOptions, [routingOptions]);

  const getInitialOptionCallback = useCallback((): RoutingOption<T> | undefined => {
    return getInitialOption(route, memoizedOptions);
  }, [route, memoizedOptions, getInitialOption]);

  const [selectedRoutingOption, setSelectedRoutingOption] = useState<RoutingOption<T> | undefined>(
    getInitialOptionCallback()
  );

  useEffect(() => {
    setSelectedRoutingOption(getInitialOptionCallback());
  }, [getInitialOptionCallback]);

  const parsedAppData = appDataSchema.safeParse(appData);

  if (!parsedAppData.success) return null;

  const validatedAppData = parsedAppData.data as { enabled?: boolean };

  const isAppDisabled = !validatedAppData?.enabled;

  const appDisabledOption = {
    label: t("crm_not_enabled_on_event_type", { appName }),
    value: "disabled",
  };

  return (
    <div>
      <div className="flex">
        <span className="flex items-center text-emphasis text-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={iconPath} alt="" className="mr-2 h-6 w-6" /> {t("crm_routing_option", { appName })}
        </span>
        {isAppDisabled ? (
          <Select value={appDisabledOption} isDisabled className="ml-2 w-full" />
        ) : (
          <Select
            options={memoizedOptions}
            value={selectedRoutingOption}
            onChange={(e): void => {
              if (e) {
                onOptionChange(e.value);
                setSelectedRoutingOption(e);
              }
            }}
            className="ml-2 w-full"
          />
        )}
      </div>
      {children}
    </div>
  );
}

export type { RoutingFormOptionsProps, RoutingOption } from "./RoutingFormOptions.types";

export default RoutingFormOptions;
