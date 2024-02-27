import { ApiVersion } from "../types";

type EndpointDeclaration = {
  uri: string;
  auth: "public" | "access_token" | "secret";
  apiVersion: ApiVersion;
};

export enum Endpoints {
  RESERVE_SLOT = "RESERVE_SLOT",
  DELETE_SELECTED_SLOT = "DELETE_SELECTED_SLOT",
  AVAILABLE_SLOTS = "AVAILABLE_SLOTS",
}

const publicEndpoint = (uri: string, version = ApiVersion.NEUTRAL): EndpointDeclaration => {
  return {
    uri,
    auth: "public",
    apiVersion: version,
  };
};

const ENDPOINTS: Record<Endpoints, EndpointDeclaration> = {
  RESERVE_SLOT: publicEndpoint("slots/reserve"),
  AVAILABLE_SLOTS: publicEndpoint("slots/available"),
  DELETE_SELECTED_SLOT: publicEndpoint("slots/delete"),
} as const;

export const getEndpointData = (endpoint: Endpoints): EndpointDeclaration => {
  return ENDPOINTS[endpoint];
};
