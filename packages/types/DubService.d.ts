export interface TrackLead {
  clickId: string;
  name: string;
  email: string;
  externalId?: string;
  eventName?: string;
}

export interface DUB {
  /**
   * Tracks lead conversion events.
   * @param clickId - The `dub_id` query parameter value.
   * @param name - The name of the booker.
   * @param email - The email of the booker.
   * @param externalId - Defaults to the email of the booker if not provided.
   */
  trackLead(props: TrackLead): Promise<void>;
}

export type DubClass = Class<DUB>;
