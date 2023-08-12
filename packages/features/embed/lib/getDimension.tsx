export const getDimension = (dimension: string) => {
  if (dimension.match(/^\d+$/)) {
    dimension = `${dimension}%`;
  }
  return dimension;
};
