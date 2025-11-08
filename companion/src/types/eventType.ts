export interface EventType {
  id: number;
  title: string;
  slug: string;
  length: number;
  description?: string;
  hidden: boolean;
  position: number;
  locations?: Array<{
    type: string;
    address?: string;
    link?: string;
  }>;
}

export interface EventTypesResponse {
  status: string;
  data: EventType[];
}
