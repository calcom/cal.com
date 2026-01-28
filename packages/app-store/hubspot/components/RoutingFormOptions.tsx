import { useLocale } from "@calcom/lib/hooks/useLocale";

import RoutingFormOptionsBase from "../../_components/crm/RoutingFormOptions";
import type { RoutingOption } from "../../_components/crm/RoutingFormOptions";
import type { LocalRouteWithRaqbStates, AttributeRoutingConfig } from "../../routing-forms/types/types";
import { appDataSchema } from "../zod";

enum HubspotRoutingConfig {
  ROUTE_OWNER = "route_owner",
  SKIP_OWNER = "skip_owner",
}

const APP_NAME = "HubSpot";

const RoutingFormOptions = ({
  appData,
  route,
  setAttributeRoutingConfig,
}: {
  appData: unknown;
  route: LocalRouteWithRaqbStates;
  setAttributeRoutingConfig: (id: string, attributeRoutingConfig: Partial<AttributeRoutingConfig>) => void;
}): JSX.Element | null => {
  const { t } = useLocale();

  const hubspotRoutingOptions: RoutingOption<HubspotRoutingConfig>[] = [
    {
      label: t("crm_route_to_contact_owner", { appName: APP_NAME }),
      value: HubspotRoutingConfig.ROUTE_OWNER,
    },
    {
      label: t("crm_skip_contact_owner", { appName: APP_NAME }),
      value: HubspotRoutingConfig.SKIP_OWNER,
    },
  ];

  const getInitialOption = (
    currentRoute: LocalRouteWithRaqbStates,
    options: RoutingOption<HubspotRoutingConfig>[]
  ): RoutingOption<HubspotRoutingConfig> | undefined => {
    if (currentRoute.attributeRoutingConfig?.skipContactOwner) {
      return options.find((option) => option.value === HubspotRoutingConfig.SKIP_OWNER);
    }
    return options.find((option) => option.value === HubspotRoutingConfig.ROUTE_OWNER);
  };

  const onOptionChange = (value: HubspotRoutingConfig): void => {
    switch (value) {
      case HubspotRoutingConfig.ROUTE_OWNER:
        setAttributeRoutingConfig(route.id, {
          skipContactOwner: false,
          hubspot: {
            skipOwner: false,
          },
        });
        break;
      case HubspotRoutingConfig.SKIP_OWNER:
        setAttributeRoutingConfig(route.id, {
          skipContactOwner: true,
          hubspot: {
            skipOwner: true,
          },
        });
        break;
    }
  };

  return (
    <RoutingFormOptionsBase<HubspotRoutingConfig>
      appData={appData}
      appDataSchema={appDataSchema}
      route={route}
      setAttributeRoutingConfig={setAttributeRoutingConfig}
      iconPath="/app-store/hubspot/icon.svg"
      appName={APP_NAME}
      routingOptions={hubspotRoutingOptions}
      getInitialOption={getInitialOption}
      onOptionChange={onOptionChange}
    />
  );
};

export default RoutingFormOptions;
