export const ensureNoServiceAccountKey = (key: string) => {
  if (key.includes("service_account")) {
    throw new Error("Service account keys are not allowed");
  }
  return key;
};
