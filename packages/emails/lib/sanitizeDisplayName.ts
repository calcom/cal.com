export const sanitizeDisplayName = (nameAndEmail: string) => {
  const match = nameAndEmail.match(/^(.*?)\s<(.*)>$/);

  if (match) {
    const sanitizedName = sanitize(match[1]);
    return `${sanitizedName} <${match[2]}>`;
  }

  return nameAndEmail;
};

const sanitize = (name: string) => {
  const charsToReplace = /[;,"<>():]/g;
  let cleanName = name.replace(charsToReplace, " ").replace(/\s+/g, " ");

  // Additional logic to break domain-like patterns
  // Only transform if the string contains a dot and looks like a domain
  if (/\S+\.\S+/.test(cleanName)) {
    cleanName = cleanName.replace(/\./g, "[dot]");
  }

  return cleanName;
};
