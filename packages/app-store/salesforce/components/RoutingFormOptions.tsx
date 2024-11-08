import { useState, useEffect } from "react";

import { Select, Input, Label } from "@calcom/ui";

import type { LocalRouteWithRaqbStates, AttributeRoutingConfig } from "../../routing-forms/types/types";
import { appDataSchema } from "../zod";

enum SalesforceRoutingConfig {
  ROUTE_OWNER = "route_owner",
  SKIP_OWNER = "skip_owner",
  ACCOUNT_FIELD_LOOKUP = "account_field_lookup",
}

const RoutingFormOptions = ({
  appData,
  route,
  setAttributeRoutingConfig,
}: {
  appData: any;
  route: LocalRouteWithRaqbStates;
  setAttributeRoutingConfig: (id: string, attributeRoutingConfig: Partial<AttributeRoutingConfig>) => void;
}) => {
  const salesforceRoutingOptions = [
    {
      label: "Contact owner will be the Round Robin host if available",
      value: SalesforceRoutingConfig.ROUTE_OWNER,
    },
    {
      label:
        "Contact owner will not be forced (can still be host if it matches the attributes and Round Robin criteria)",
      value: SalesforceRoutingConfig.SKIP_OWNER,
    },
    {
      label: "Route to a user that matches a lookup field on an account",
      value: SalesforceRoutingConfig.ACCOUNT_FIELD_LOOKUP,
    },
  ];

  const getInitialOption = () => {
    if (route.attributeRoutingConfig?.salesforce?.rrSkipToAccountLookupField) {
      return salesforceRoutingOptions.find(
        (option) => option.value === SalesforceRoutingConfig.ACCOUNT_FIELD_LOOKUP
      );
    }

    if (route.attributeRoutingConfig?.skipContactOwner) {
      return salesforceRoutingOptions.find((option) => option.value === SalesforceRoutingConfig.SKIP_OWNER);
    } else {
      return salesforceRoutingOptions.find((option) => option.value === SalesforceRoutingConfig.ROUTE_OWNER);
    }
  };

  const [selectedRoutingOption, setSelectedRoutingOption] = useState(getInitialOption());

  useEffect(() => {
    setSelectedRoutingOption(getInitialOption());
  }, [route]);

  const [rrSkipToAccountLookupFieldName, setRRSkipToAccountLookupFieldName] = useState(
    route.attributeRoutingConfig?.salesforce?.rrSKipToAccountLookupFieldName ?? ""
  );

  const parsedAppData = appDataSchema.safeParse(appData);

  if (!parsedAppData.success) return null;

  appData = parsedAppData.data;

  const isAppDisabled = !appData?.enabled;

  const appDisabledOption = {
    label: "Salesforce is not enabled on event type",
    value: "disabled",
  };

  const onRRSkipToAccountLookupFieldNameChange = (value: string) => {
    setAttributeRoutingConfig(route.id, {
      ...route.attributeRoutingConfig,
      salesforce: { ...route.attributeRoutingConfig?.salesforce, rrSKipToAccountLookupFieldName: value },
    });
  };

  const onOptionChange = (value: SalesforceRoutingConfig) => {
    switch (value) {
      case SalesforceRoutingConfig.ROUTE_OWNER:
        setAttributeRoutingConfig(route.id, {
          skipContactOwner: false,
          salesforce: {
            rrSkipToAccountLookupField: false,
          },
        });
        break;
      case SalesforceRoutingConfig.SKIP_OWNER:
        setAttributeRoutingConfig(route.id, {
          skipContactOwner: true,
          salesforce: {
            rrSkipToAccountLookupField: false,
          },
        });
        break;
      case SalesforceRoutingConfig.ACCOUNT_FIELD_LOOKUP:
        setAttributeRoutingConfig(route.id, {
          skipContactOwner: false,
          salesforce: {
            rrSkipToAccountLookupField: true,
            rrSKipToAccountLookupFieldName: rrSkipToAccountLookupFieldName,
          },
        });
        break;
    }
  };

  return (
    <div>
      <div className="flex">
        <span className="text-emphasis flex items-center text-sm">
          <img src="/app-store/salesforce/icon.png" className="mr-2 h-6 w-6" /> Salesforce option
        </span>
        {isAppDisabled ? (
          <Select value={appDisabledOption} isDisabled className="ml-2 w-full" />
        ) : (
          <Select
            options={salesforceRoutingOptions}
            value={selectedRoutingOption}
            onChange={(e) => {
              if (e) {
                onOptionChange(e.value);
                setSelectedRoutingOption(e);
              }
            }}
            className="ml-2 w-full"
          />
        )}
      </div>
      {selectedRoutingOption?.value === SalesforceRoutingConfig.ACCOUNT_FIELD_LOOKUP ? (
        <div>
          <Label className="mt-2">Lookup Field Name</Label>
          <Input
            value={rrSkipToAccountLookupFieldName}
            onChange={(e) => {
              setRRSkipToAccountLookupFieldName(e.target.value);
              onRRSkipToAccountLookupFieldNameChange(e.target.value);
            }}
          />
        </div>
      ) : null}
    </div>
  );
};

export default RoutingFormOptions;
