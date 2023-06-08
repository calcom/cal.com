export function hasFilter(filters: Record<string, unknown>) {
  return Object.entries(filters).some(([, filter]) => {
    return !!filter;
  });
}
