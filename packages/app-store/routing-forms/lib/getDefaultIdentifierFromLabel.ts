export function getDefaultIdentifierFromLabel(label: string) {
  return label.trim().replace(/\s+/g, "_").toLowerCase().replace(/_+$/g, "");
}

export default getDefaultIdentifierFromLabel;
