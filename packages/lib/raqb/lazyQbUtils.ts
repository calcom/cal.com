// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../types/react-awesome-query-builder.d.ts" />
import type { JsonTree, ImmutableTree, JsonLogicResult } from "react-awesome-query-builder";
import * as ExportUtils from "react-awesome-query-builder/lib/export";
// Import runtime functions from Node.js-compatible submodules (no React dependencies)
import * as ImportUtils from "react-awesome-query-builder/lib/import";
import * as UtilsModule from "react-awesome-query-builder/lib/utils";

export function loadTree(queryValue: JsonTree): ImmutableTree {
  return ImportUtils.loadTree(queryValue) as ImmutableTree;
}

// Use any for config to avoid "Excessive stack depth comparing types" errors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function checkTree(tree: any, config: any): ImmutableTree {
  return ImportUtils.checkTree(tree, config) as ImmutableTree;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function jsonLogicFormat(tree: any, config: any): JsonLogicResult {
  return ExportUtils.jsonLogicFormat(tree, config) as JsonLogicResult;
}

export function uuid(): string {
  return UtilsModule.uuid() as string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getTree(tree: any): JsonTree {
  return ImportUtils.getTree(tree) as JsonTree;
}
