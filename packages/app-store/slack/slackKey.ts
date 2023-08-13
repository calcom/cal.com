export type SlackCredentialKey = {
  ok: boolean;
  team: {
    id: string;
    name: string;
  };
  scope: string;
  app_id: string;
  enterprise: null | any;
  token_type: string;
  authed_user: { id: string };
  bot_user_id: string;
  access_token: string;
  incoming_webhook: {
    url: string;
    channel: string;
    channel_id: string;
    configuration_url: string;
  };
  is_enterprise_install: boolean;
};
