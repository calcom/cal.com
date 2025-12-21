import { useQueryState } from "nuqs";

export function useSelectedBookingId() {
  return useQueryState("selectedId", {
    defaultValue: null,
    parse: (value) => {
      if (!value) return null;
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? null : parsed;
    },
    serialize: (value) => (value ? String(value) : ""),
    clearOnDefault: true,
  });
}
