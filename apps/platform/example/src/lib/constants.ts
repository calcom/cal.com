export const professions = [
  { label: "Hair dresser", value: "hair dresser" },
  { label: "Therapist", value: "therapist" },
  { label: "Dermatologist", value: "dermatologist" },
] as const satisfies Array<{label: string; value: string}>;

export const defaultSort = {
  title: "Relevance",
  slug: null,
  sortKey: "RELEVANCE",
  reverse: false,
};

export const sorting = [
  defaultSort,
  {
    title: "Availability",
    slug: "available-desc",
    sortKey: "MOST_AVAILABLE",
    reverse: false,
  }, // asc
];