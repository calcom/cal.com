/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "react-awesome-query-builder/lib/import" {
  export function loadTree(queryValue: any): any;
  export function checkTree(tree: any, config: any): any;
  export function getTree(tree: any): any;
}

declare module "react-awesome-query-builder/lib/export" {
  export function jsonLogicFormat(tree: any, config: any): any;
}

declare module "react-awesome-query-builder/lib/utils" {
  export function uuid(): string;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
