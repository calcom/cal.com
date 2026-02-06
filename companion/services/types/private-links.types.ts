// Private Link Types
export interface PrivateLink {
  id: number;
  link: string;
  enabled: boolean;
  eventTypeId: number;
}

export interface CreatePrivateLinkInput {
  enabled?: boolean;
}

export interface UpdatePrivateLinkInput {
  enabled?: boolean;
}

export interface GetPrivateLinksResponse {
  status: string;
  data: PrivateLink[];
}

export interface GetPrivateLinkResponse {
  status: string;
  data: PrivateLink;
}
