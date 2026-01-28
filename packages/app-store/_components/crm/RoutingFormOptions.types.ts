import type { z } from "zod";

import type { LocalRouteWithRaqbStates, AttributeRoutingConfig } from "../../routing-forms/types/types";

export interface RoutingOption<T extends string = string> {
  label: string;
  value: T;
}

export interface RoutingFormOptionsProps<T extends string = string> {
  /** The app data from the event type */
  appData: unknown;
  /** Zod schema to validate the app data */
  appDataSchema: z.ZodTypeAny;
  /** The current route being configured */
  route: LocalRouteWithRaqbStates;
  /** Callback to update the routing config for a route */
  setAttributeRoutingConfig: (id: string, attributeRoutingConfig: Partial<AttributeRoutingConfig>) => void;
  /** Path to the app icon (e.g., "/app-store/hubspot/icon.svg") */
  iconPath: string;
  /** Display name of the app (e.g., "HubSpot", "Salesforce") - used for translations */
  appName: string;
  /** Available routing options for this CRM */
  routingOptions: RoutingOption<T>[];
  /** Function to determine the initial selected option based on route config */
  getInitialOption: (
    route: LocalRouteWithRaqbStates,
    options: RoutingOption<T>[]
  ) => RoutingOption<T> | undefined;
  /** Callback when the selected option changes */
  onOptionChange: (value: T) => void;
  /** Optional children to render below the select (e.g., additional input fields) */
  children?: React.ReactNode;
}
