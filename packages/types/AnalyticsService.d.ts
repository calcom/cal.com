export interface SendEventProps {
  name: string;
  email: string;
  id: string;
  eventName: string;
  externalId?: string;
}

export interface AnalyticsService {
  sendEvent(props: SendEventProps): Promise<void>;
}

export type AnalyticsServiceClass = Class<AnalyticsService>;
