export type AtomEventTypeListItem = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  length: number;
  locations: unknown;
  logo?: string;
};

export type AtomEventTypesResponse = {
  eventTypes: AtomEventTypeListItem[];
};