/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ApiVersion } from "../types";

type BaseEndpointDeclaration = {
  auth: "public" | "access_token" | "secret";
  apiVersion: ApiVersion;
};

// Define a type for static URIs
type StaticUriEndpoint = BaseEndpointDeclaration & {
  uri: string;
  constructUriFromObject?: never;
  constructUriFromArray?: never;
};

// Introduce a generic type for dynamic URIs, allowing for explicit parameter type declaration
type DynamicUriEndpoint = BaseEndpointDeclaration & {
  uri?: never; // Ensure uri is not used here
  constructUriFromArray?: (params: string[]) => string;
  constructUriFromObject?: (params: Record<string, string>) => string;
};

// Create a discriminated union of the two types, incorporating generics
type EndpointDeclaration = StaticUriEndpoint | DynamicUriEndpoint;

export enum Endpoints {
  RESERVE_SLOT = "RESERVE_SLOT",
  DELETE_SELECTED_SLOT = "DELETE_SELECTED_SLOT",
  AVAILABLE_SLOTS = "AVAILABLE_SLOTS",
  GET_PUBLIC_EVENT = "GET_PUBLIC_EVENT",
  EXCHANGE_OAUTH_AUTH_TOKEN = "EXCHANGE_OAUTH_AUTH_TOKEN",
  REFRESH_OAUTH_TOKEN = "REFRESH_OAUTH_TOKEN",
  CREATE_EVENT_TYPE = "CREATE_EVENT_TYPE",
  GET_EVENT_TYPE_BY_ID = "GET_EVENT_TYPE_BY_ID",
  CREATE_SCHEDULE = "CREATE_SCHEDULE",
  GET_DEFAULT_SCHEDULE = "GET_DEFAULT_SCHEDULE",
  GET_ALL_SCHEDULES = "GET_ALL_SCHEDULES",
  GET_SCHEDULE_BY_ID = "GET_SCHEDULE_BY_ID",
  GET_SUPPORTED_TIMEZONES = "GET_SUPPORTED_TIMEZONES",
  UPDATE_SCHEDULE_BY_ID = "UPDATE_SCHEDULE_BY_ID",
  DELETE_SCHEDULE_BY_ID = "DELETE_SCHEDULE_BY_ID",
  GET_MANAGED_USERS_BY_CLIENT_ID = "GET_MANAGED_USERS_BY_CLIENT_ID",
  CREATE_MANAGED_USER = "CREATE_MANAGED_USER",
  GET_MANAGED_USER_BY_ID = "GET_MANAGED_USER_BY_ID",
}

const publicEndpoint = (uri: string, version = ApiVersion.NEUTRAL): EndpointDeclaration => ({
  uri,
  auth: "public",
  apiVersion: version,
});

const constructUri = (
  endpointData: {
    constructUriFromArray?: (params: string[]) => string;
    constructUriFromObject?: (params: Record<string, string>) => string;
  },
  params: string[] | Record<string, string>
) => {
  if (endpointData.constructUriFromObject && isParamsRecord(params)) {
    return endpointData.constructUriFromObject(params);
  }
  if (endpointData.constructUriFromArray && Array.isArray(params)) {
    return endpointData.constructUriFromArray(params);
  }
  throw new Error("Invalid parameter type for dynamic endpoint.");
};

const ENDPOINTS: Record<Endpoints, EndpointDeclaration> = {
  RESERVE_SLOT: publicEndpoint("slots/reserve", ApiVersion.V2),
  AVAILABLE_SLOTS: publicEndpoint("slots/available", ApiVersion.V2),
  DELETE_SELECTED_SLOT: publicEndpoint("slots/delete", ApiVersion.V2),
  GET_PUBLIC_EVENT: publicEndpoint("events/"),
  EXCHANGE_OAUTH_AUTH_TOKEN: {
    auth: "public",
    constructUriFromArray: ([clientId]) => `oauth/${clientId}/exchange`,
    apiVersion: ApiVersion.V2,
  },
  REFRESH_OAUTH_TOKEN: {
    auth: "public",
    constructUriFromArray: ([clientId]) => `oauth/${clientId}/refresh`,
    apiVersion: ApiVersion.V2,
  },
  CREATE_EVENT_TYPE: {
    apiVersion: ApiVersion.V2,
    auth: "access_token",
    uri: `event-types`,
  },
  GET_EVENT_TYPE_BY_ID: {
    apiVersion: ApiVersion.V2,
    auth: "access_token",
    constructUriFromArray: ([eventTypeId]) => `event-types/${eventTypeId}`,
  },
  CREATE_SCHEDULE: {
    apiVersion: ApiVersion.V2,
    auth: "access_token",
    uri: "schedules",
  },
  GET_DEFAULT_SCHEDULE: {
    apiVersion: ApiVersion.V2,
    auth: "access_token",
    uri: "schedules/default",
  },
  GET_ALL_SCHEDULES: {
    apiVersion: ApiVersion.V2,
    auth: "access_token",
    uri: "schedules",
  },
  GET_SCHEDULE_BY_ID: {
    apiVersion: ApiVersion.V2,
    auth: "access_token",
    constructUriFromArray: ([scheduleId]) => `schedules/${scheduleId}`,
  },
  GET_SUPPORTED_TIMEZONES: publicEndpoint("schedules/time-zones", ApiVersion.V2),
  UPDATE_SCHEDULE_BY_ID: {
    apiVersion: ApiVersion.V2,
    auth: "access_token",
    constructUriFromArray: ([scheduleId]) => `schedules/${scheduleId}`,
  },
  DELETE_SCHEDULE_BY_ID: {
    apiVersion: ApiVersion.V2,
    auth: "access_token",
    constructUriFromArray: ([scheduleId]) => `schedules/${scheduleId}`,
  },
  GET_MANAGED_USERS_BY_CLIENT_ID: {
    apiVersion: ApiVersion.V2,
    auth: "secret",
    constructUriFromArray: ([clientId]) => `oauth-clients/${clientId}/users`,
  },
  CREATE_MANAGED_USER: {
    apiVersion: ApiVersion.V2,
    auth: "secret",
    constructUriFromArray: ([clientId]) => `oauth-clients/${clientId}/users`,
  },
  GET_MANAGED_USER_BY_ID: {
    apiVersion: ApiVersion.V2,
    auth: "secret",
    constructUriFromArray: ([clientId, userId]) => `oauth-clients/${clientId}/users/${userId}`,
  },
} as const;

const isParamsRecord = (params: unknown): params is Record<string, string> => {
  return params !== null && typeof params === "object" && !Array.isArray(params);
};

export const getEndpointDefinition = (endpoint: Endpoints): BaseEndpointDeclaration => {
  return ENDPOINTS[endpoint];
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

  if (endpointData.uri) {
    return {
      version: endpointData.apiVersion,
      uri: endpointData.uri,
      auth: endpointData.auth,
    };
  }

  if (!params) {
    throw new Error(`Parameters are required for dynamic ${endpoint} endpoint.`);
  }

  if (
    typeof endpointData.constructUriFromArray !== "function" &&
    typeof endpointData.constructUriFromObject !== "function"
  ) {
    throw new Error(`Endpoint configuration error for ${endpoint}`);
  }

  return {
    version: endpointData.apiVersion,
    uri: constructUri(endpointData, params),
    auth: endpointData.auth,
  };
};
