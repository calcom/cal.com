export const slugify = (str: string) => {
  return str.replace(/\s+/g, "-").toLowerCase();
};

export default slugify;
