export function getApiNameWithNamespace({
  namespace,
  mainApiName,
}: {
  namespace: string;
  mainApiName: string;
}) {
  const isAValidVariableName = /^[a-zA-Z_$][a-zA-Z_$0-9]*$/.test(namespace);
  // Try to use dot notation if possible because it's more readable otherwise use bracket notation
  return isAValidVariableName ? `${mainApiName}.ns.${namespace}` : `${mainApiName}.ns["${namespace}"]`;
}

function getApiNameWithoutNamespace({ mainApiName }: { mainApiName: string }) {
  return mainApiName;
}

export function getApiNameForReactSnippet({ mainApiName }: { mainApiName: string }) {
  return getApiNameWithoutNamespace({ mainApiName });
}

export function getApiNameForVanillaJsSnippet({
  namespace,
  mainApiName,
}: {
  namespace: string;
  mainApiName: string;
}) {
  return getApiNameWithNamespace({ mainApiName, namespace });
}
