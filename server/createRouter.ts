import * as trpc from "@trpc/server";
import { Context } from "./createContext";

/**
 * Helper function to create a router with context
 */
export function createRouter() {
  return trpc.router<Context>();
}
