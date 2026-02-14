export type FeishuAppKeys = {
  app_id?: string;
  app_secret?: string;
  app_access_token?: string;
  app_ticket?: string;
  expire_date?: number;
  open_verification_token?: string;
};

export type FeishuAuthCredentials = {
  expiry_date: number;
  access_token: string;
  refresh_token: string;
  refresh_expires_date: number;
};

export type RefreshTokenResp = {
  code: number;
  msg: string;
  data: {
    access_token: string;
    token_type: string;
    expires_in: number;
    name: string;
    en_name: string;
    avatar_url: string;
    avatar_thumb: string;
    avatar_middle: string;
    avatar_big: string;
    open_id: string;
    union_id: string;
    tenant_key: string;
    refresh_expires_in: number;
    refresh_token: string;
  };
};

export type FeishuEvent = {
  event_id?: string;
  organizer_calendar_id?: string;
  summary: string;
  description: string;
  start_time: {
    timestamp: string;
    timezone: string;
  };
  end_time: {
    timestamp: string;
    timezone: string;
  };
  attendee_ability: "none";
  free_busy_status: "busy";
  location?: {
    name?: string;
  };
  reminders: [
    {
      minutes: number;
    },
  ];
};

export type CreateEventResp = {
  code: number;
  msg: string;
  data: {
    event: FeishuEvent;
  };
};

export type FeishuEventAttendee = {
  type: "user" | "third_party";
  is_optional: boolean;
  user_id?: string;
  third_party_email: string;
};

export type CreateAttendeesResp = {
  code: number;
  msg: string;
  data: {
    attendees: FeishuEventAttendee[];
  };
};

export type ListAttendeesResp = {
  code: number;
  msg: string;
  data: {
    items: (FeishuEventAttendee & { attendee_id: string })[];
    has_more: boolean;
    page_token: string;
  };
};

export type FreeBusyResp = {
  code: number;
  msg: string;
  data: {
    error_calendar_list: {
      calendar_id: string;
      error_msg: string;
    }[];
    freebusy_list: {
      calendar_id: string;
      end_time: string;
      start_time: string;
    }[];
  };
};

export type BufferedBusyTime = {
  start: string;
  end: string;
};

export type ListCalendarsResp = {
  code: number;
  msg: string;
  data: {
    has_more: boolean;
    page_token: string;
    sync_token: string;
    calendar_list: [
      {
        calendar_id: string;
        summary: string;
        description: string;
        permissions: "private" | "show_only_free_busy" | "public";
        type: "unknown" | "shared" | "primary" | "google" | "resource" | "exchange";
        summary_alias: string;
        is_deleted: boolean;
        is_third_party: boolean;
        role: "unknown" | "free_busy_reader" | "reader" | "writer" | "owner";
      },
    ];
  };
};

export type GetPrimaryCalendarsResp = {
  code: number;
  msg: string;
  data: {
    calendars: [
      {
        calendar: {
          calendar_id: string;
          color: number;
          description: string;
          permissions: "private" | "show_only_free_busy" | "public";
          role: "unknown" | "free_busy_reader" | "reader" | "writer" | "owner";
          summary: string;
          summary_alias: string;
          type: "unknown" | "shared" | "primary" | "google" | "resource" | "exchange";
        };
        user_id: string;
      },
    ];
  };
};
