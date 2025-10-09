import type { JsonTree, Config, ImmutableTree } from "react-awesome-query-builder";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let qbUtils: any = null;

async function loadQbUtils() {
  if (!qbUtils) {
    const module = await import("react-awesome-query-builder");
    qbUtils = module.Utils;
  }
  return qbUtils;
}

export async function loadTree(queryValue: JsonTree) {
  const utils = await loadQbUtils();
  return utils.loadTree(queryValue);
}

export async function checkTree(tree: ImmutableTree, config: Config) {
  const utils = await loadQbUtils();
  return utils.checkTree(tree, config);
}

export async function jsonLogicFormat(tree: ImmutableTree, config: Config) {
  const utils = await loadQbUtils();
  return utils.jsonLogicFormat(tree, config);
}

export async function uuid() {
  const utils = await loadQbUtils();
  return utils.uuid();
}

export async function getTree(tree: ImmutableTree) {
  const utils = await loadQbUtils();
  return utils.getTree(tree);
}
