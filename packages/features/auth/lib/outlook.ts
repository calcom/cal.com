export const OUTLOOK_CLIENT_ID = process.env.MS_GRAPH_CLIENT_ID;
export const OUTLOOK_CLIENT_SECRET = process.env.MS_GRAPH_CLIENT_SECRET;
export const OUTLOOK_LOGIN_ENABLED = process.env.OUTLOOK_LOGIN_ENABLED === "true";
export const IS_OUTLOOK_LOGIN_ENABLED = !!(
  OUTLOOK_CLIENT_ID &&
  OUTLOOK_CLIENT_SECRET &&
  process.env.OUTLOOK_LOGIN_ENABLED === "true"
);
