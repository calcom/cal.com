import RoutingFormsRoutingConfig from "../app-routing.config";
import type { Component } from "./types";

export const getComponent = (route: string): Component => {
  return (RoutingFormsRoutingConfig as unknown as Record<string, Component>)[route];
};
