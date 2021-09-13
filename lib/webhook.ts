export interface Webhook {
  id: number;
  subscriberUrl: string | null;
  active: boolean;
  eventTriggers: string[];
  prevState: null;
}
