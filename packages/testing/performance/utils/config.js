import { sleep } from "k6";
import { SharedArray } from "k6/data";

export const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
if (BASE_URL.includes("cal.com")) {
  throw new Error("BLOCKED: Do not run against production domain");
}

export const SLEEP_DURATION = {
  SHORT: 1,
  MEDIUM: 3,
  LONG: 5,
};

export const THRESHOLDS = {
  HTTP_ERRORS: ["rate<0.01"],

  RESPONSE_TIME: {
    SMOKE: {
      p95: ["p(95)<500"], // 95% of requests should be below 500ms
      p99: ["p(99)<1000"], // 99% of requests should be below 1000ms
    },
    LOAD: {
      p95: ["p(95)<1000"], // 95% of requests should be below 1000ms
      p99: ["p(99)<2000"], // 99% of requests should be below 2000ms
    },
    STRESS: {
      p95: ["p(95)<2000"], // 95% of requests should be below 2000ms
      p99: ["p(99)<4000"], // 99% of requests should be below 4000ms
    },
    SPIKE: {
      p95: ["p(95)<3000"], // 95% of requests should be below 3000ms
      p99: ["p(99)<6000"], // 99% of requests should be below 6000ms
    },
  },
};

export const TEST_USERS = new SharedArray("users", () => [
  { username: __ENV.TEST_USER_FREE || "free", password: __ENV.TEST_PASSWORD_FREE || "free" },
  { username: __ENV.TEST_USER_PRO || "pro", password: __ENV.TEST_PASSWORD_PRO || "pro" },
]);

export function getRandomUser() {
  return TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)];
}

export function randomQueryParam() {
  return `nocache=${Date.now()}`;
}

export function randomSleep(min = SLEEP_DURATION.SHORT, max = SLEEP_DURATION.MEDIUM) {
  if (min > max) {
    throw new Error("min cannot be greater than max");
  }
  const sleepTime = Math.random() * (max - min) + min;
  sleep(sleepTime);
}
