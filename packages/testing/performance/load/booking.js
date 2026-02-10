import { sleep } from "k6";
import { THRESHOLDS } from "../utils/config.js";
import { viewBookingPage } from "../utils/helpers.js";

export const options = {
  stages: [
    { duration: "2m", target: 500 }, // Ramp up to 500 VUs over 2 minutes
    { duration: "3m", target: 1000 }, // Ramp up to 1000 VUs over 3 minutes
    { duration: "5m", target: 2000 }, // Ramp up to 2000 VUs over 5 minutes
    { duration: "10m", target: 2000 }, // Stay at 2000 VUs for 10 minutes
    { duration: "3m", target: 0 }, // Ramp down to 0 VUs over 3 minutes
  ],
  thresholds: {
    http_req_failed: THRESHOLDS.HTTP_ERRORS,
    http_req_duration: THRESHOLDS.RESPONSE_TIME.LOAD.p95,
  },
};

export default function () {
  viewBookingPage("pro", "30min");

  sleep(0.1);
}
