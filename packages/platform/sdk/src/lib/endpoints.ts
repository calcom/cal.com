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
    (params) => `oauth/token/${params.join("/")}`,
    ApiVersion.NEUTRAL
  ),
} as const;

// Assuming getEndpointData is defined to accept both types
export const getEndpointData = (
  endpoint: Endpoints,
  params?: Record<string, string> | string[]
): {
  uri: string;
  version: ApiVersion;
  auth: string; // Simplified for illustration
} => {
  const endpointData = ENDPOINTS[endpoint];

  // Assume all dynamic endpoints require string[] for simplicity
  if ("constructUri" in endpointData && Array.isArray(params)) {
    return {
      version: endpointData.apiVersion,
      uri: endpointData.constructUri!(params),
      auth: endpointData.auth,
    };
  } else if ("constructUri" in endpointData && typeof params === "object") {
    // This branch is for Record<string, string>, but you'd need a different approach or assumption
    // Perhaps call a different or adapted constructUri function that can handle Record<string, string>
    throw new Error("Unsupported parameter type for this endpoint.");
  } else if ("uri" in endpointData) {
    // Static URI handling
    return {
      version: endpointData.apiVersion,
      uri: endpointData.uri!,
      auth: endpointData.auth,
    };
  } else {
    throw new Error("Endpoint configuration error.");
  }
};
