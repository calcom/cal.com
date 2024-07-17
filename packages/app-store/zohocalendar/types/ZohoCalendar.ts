export type ZohoAuthCredentials = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  server_location: string;
};

export type FreeBusy = {
  fbtype: string;
  startTime: string;
  endTime: string;
};

export type ZohoCalendarListResp = {
  calendars: {
    name: string;
    include_infreebusy: boolean;
    textcolor: string;
    isdefault: boolean;
    status: boolean;
    visibility: boolean;
    timezone: string;
    lastmodifiedtime: string;
    color: string;
    uid: string;
    description: string;
    privilege: string;
    private: {
      status: string;
      icalurl: string;
      htmlurl: string;
    };
    public: {
      icalurl: string;
      privilege: string;
      htmlurl: string;
    };
    reminders: {
      minutes: string;
      action: string;
    }[];
  }[];
};
