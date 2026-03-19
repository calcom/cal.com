import { useQueryState } from "nuqs";

export function useActiveSegmentFromUrl() {
  return useQueryState<"info" | "history">("activeSegment", {
    defaultValue: "info",
    parse: (value) => {
      if (!value) return "info";
      if (value === "history") return "history";
      return "info";
    },
  });
}
