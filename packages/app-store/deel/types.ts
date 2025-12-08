export interface DeelOAuthToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface DeelEmployee {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

export enum DeelTimeOffType {
  PTO = "pto",
  SICK_LEAVE = "sick_leave",
  PUBLIC_HOLIDAY = "public_holiday",
  OTHER = "other",
}

export interface DeelTimeOffEvent {
  id: string;
  employee_id: string;
  type: DeelTimeOffType;
  start_date: string;
  end_date: string;
  status: string;
  notes?: string;
}

export interface DeelWebhookPayload {
  event: "time_off.created" | "time_off.updated" | "time_off.deleted";
  data: DeelTimeOffEvent;
  timestamp: string;
}

export interface DeelCredentialKey {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  employee_id?: string;
}
