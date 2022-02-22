export const slugify = (str: string) => {
  return str.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase();
};

export default slugify;
