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

  return name.replace(charsToReplace, " ").replace(/\s+/g, " ");
};
