export { createCRMEvent as handler } from "../../crm/createCRMEvent";
export const config = {
  minRetryIntervalMins: process.env.NODE_ENV === "production" ? 10 : 1,
  maxAttempts: 10,
};
