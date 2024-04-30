import { type Option } from "~/app/_components/autocomplete";

export const professions = [
  { label: "Hair dresser", value: "hair-dresser" },
  { label: "Therapist", value: "therapist" },
  { label: "Dermatologist", value: "dermatologist" },
]  satisfies Array<Option>;

export const services = [
  { name: "Haircut", isRemote: false, profession: "hair-dresser" },
  { name: "Hair coloring", isRemote: false, profession: "hair-dresser" },
  { name: "Hair styling", isRemote: false, profession: "hair-dresser" },
  { name: "Beard trimming", isRemote: true, profession: "hair-dresser" },
  { name: "Therapy", isRemote: true, profession: "therapist" },
  { name: "Skin consultation", isRemote: false, profession: "dermatologist"},
] satisfies Array<{name: string; isRemote: boolean, profession: string}>;

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