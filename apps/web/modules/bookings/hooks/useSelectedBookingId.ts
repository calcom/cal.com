import { useQueryState } from "nuqs";

export function useSelectedBookingId() {
  return useQueryState("selectedId", {
    defaultValue: null,
    parse: (value) => (value ? parseInt(value, 10) : null),
    serialize: (value) => (value ? String(value) : ""),
    clearOnDefault: true,
  });
}
