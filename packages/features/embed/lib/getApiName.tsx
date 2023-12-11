export function getApiName({
  namespace,
  mainApiName = "Cal",
}: {
  namespace: string | null;
  mainApiName?: string;
}) {
  if (!namespace) {
    return mainApiName;
  }
  const isANumber = /^\d+$/.test(namespace);
  // Because cal.ns.123 is not a valid JS syntax
  return isANumber ? `${mainApiName}.ns["${namespace}"]` : `${mainApiName}.ns.${namespace}`;
}
