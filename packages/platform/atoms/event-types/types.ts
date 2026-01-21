/**
 * Event type item as returned by the atoms API
 */
export type AtomEventTypeListItem = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  length: number;
  locations: unknown | null;
  logo?: string;
};

export type AtomEventTypesResponse = {
  eventTypes: AtomEventTypeListItem[];
};
