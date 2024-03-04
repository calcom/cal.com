/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ApiVersion } from "../types";

// Define a base type with common properties
type BaseEndpointDeclaration = {
  auth: "public" | "access_token" | "secret";
  apiVersion: ApiVersion;
};

// Define a type for static URIs
type StaticUriEndpoint = BaseEndpointDeclaration & {
  uri: string;
  constructUri?: never; // Ensure constructUri is not used here
};

// Introduce a generic type for dynamic URIs, allowing for explicit parameter type declaration
type DynamicUriEndpoint<ParamsType extends Record<string, string> | string[]> = BaseEndpointDeclaration & {
  uri?: never; // Ensure uri is not used here
  constructUri: (params: ParamsType) => string;
};

// Create a discriminated union of the two types, incorporating generics
type EndpointDeclaration<ParamsType extends Record<string, string> | string[] = string[]> =
  | StaticUriEndpoint
  | DynamicUriEndpoint<ParamsType>;

export enum Endpoints {
  RESERVE_SLOT = "RESERVE_SLOT",
  DELETE_SELECTED_SLOT = "DELETE_SELECTED_SLOT",
  AVAILABLE_SLOTS = "AVAILABLE_SLOTS",
  GET_PUBLIC_EVENT = "GET_PUBLIC_EVENT",
  EXCHANGE_OAUTH_AUTH_TOKEN = "EXCHANGE_OAUTH_AUTH_TOKEN",
  REFRESH_OAUTH_TOKEN = "REFRESH_OAUTH_TOKEN",
}

const publicEndpoint = (uri: string, version = ApiVersion.NEUTRAL): EndpointDeclaration => ({
  uri,
  auth: "public",
  apiVersion: version,
});

// Adjust the constructor to use generics for flexible parameter typing
const publicEndpointConstructor = <ParamsType extends Record<string, string> | string[]>(
  constructUri: (params: ParamsType) => string,
  version: ApiVersion.NEUTRAL
): EndpointDeclaration<ParamsType> => ({
  constructUri,
  auth: "public",
  apiVersion: version,
});

const ENDPOINTS: Record<Endpoints, EndpointDeclaration> = {
  RESERVE_SLOT: publicEndpoint("slots/reserve", ApiVersion.V2),
  AVAILABLE_SLOTS: publicEndpoint("slots/available", ApiVersion.V2),
  DELETE_SELECTED_SLOT: publicEndpoint("slots/delete", ApiVersion.V2),
  GET_PUBLIC_EVENT: publicEndpoint("events/"),
  EXCHANGE_OAUTH_AUTH_TOKEN: publicEndpointConstructor<string[]>(
    ([clientId]) => `oauth/${clientId}/exchange`,
    ApiVersion.NEUTRAL
  ),
  REFRESH_OAUTH_TOKEN: publicEndpointConstructor<string[]>(
    ([clientId]) => `oauth/${clientId}/refresh`,
    ApiVersion.NEUTRAL
  ),
} as const;

const isParamsRecord = (params: unknown): params is Record<string, string> => {
  return params !== null && typeof params === "object" && !Array.isArray(params);
};

export const getEndpointData = (
  endpoint: Endpoints,
  params?: Record<string, string> | string[]
): {
  uri: string;
  version: ApiVersion;
  auth: EndpointDeclaration["auth"];
} => {
  const endpointData = ENDPOINTS[endpoint];

  // Determine if the endpoint expects a dynamic URI construction
  if (typeof endpointData.constructUri === "function") {
    if (!params) {
      throw new Error("Parameters are required for dynamic endpoints.");
    }

    // Here, we need to determine the correct type of params at runtime
    let constructedUri: string;
    if (isParamsRecord(params)) {
      // Params is a Record<string, string>, handle accordingly
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      constructedUri = endpointData.constructUri(params as Record<string, string>);
    } else if (Array.isArray(params)) {
      // Params is string[], handle accordingly
      constructedUri = endpointData.constructUri(params as string[]);
    } else {
      throw new Error("Invalid parameter type for dynamic endpoint.");
    }

    return {
      version: endpointData.apiVersion,
      uri: constructedUri,
      auth: endpointData.auth,
    };
  } else if (endpointData.uri) {
    // Handle static URIs
    return {
      version: endpointData.apiVersion,
      uri: endpointData.uri,
      auth: endpointData.auth,
    };
  } else {
    throw new Error("Endpoint configuration error.");
  }
};
