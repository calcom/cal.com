export const slugify = (str: string) => {
  return str.replace(/[^a-zA-Z0-9-]/g, "_").toLowerCase();
};

export default slugify;
