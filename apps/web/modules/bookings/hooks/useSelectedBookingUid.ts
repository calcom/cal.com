import { useQueryState } from "nuqs";

export function useSelectedBookingUid() {
  return useQueryState("uid", {
    defaultValue: null,
    parse: (value) => (value ? value : null),
    serialize: (value) => (value ? String(value) : ""),
    clearOnDefault: true,
  });
}
