export type BasecampToken = {
  projectId: number;
  expires_at: number;
  expires_in: number;
  scheduleId: number;
  access_token: string;
  refresh_token: string;
  account: {
    id: number;
    href: string;
    name: string;
    hidden: boolean;
    product: string;
    app_href: string;
  };
};
