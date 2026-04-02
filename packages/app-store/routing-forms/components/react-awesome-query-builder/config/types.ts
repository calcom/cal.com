import type { Widgets as RaqbWidgets } from "react-awesome-query-builder";

export enum ConfigFor {
  FormFields = "FormFields",
  Attributes = "Attributes",
}

export type Widgets = RaqbWidgets & { [key in keyof RaqbWidgets]: RaqbWidgets[key] & { type: string } };
export type WidgetsWithoutFactory = { [key in keyof Widgets]: Omit<Widgets[key], "factory"> };
