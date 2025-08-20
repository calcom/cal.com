import type { ComponentType } from "react";

/**
 * Generic component map type for dynamic loading
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ComponentMapType = Record<string, ComponentType<any>>;
