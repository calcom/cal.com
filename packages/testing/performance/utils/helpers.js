import { check, group } from "k6";
import http from "k6/http";
import { BASE_URL, randomQueryParam, randomSleep } from "./config.js";

export function viewBookingPage(username, eventSlug) {
  return group("View Booking Page", () => {
    const url = `${BASE_URL}/${username}/${eventSlug}?${randomQueryParam()}`;

    const response = http.get(url, {
      tags: { name: "Booking Page" },
      timeout: "30s",
    });

    check(response, {
      "Booking page loaded": (r) => r.status === 200,
      "Has booking form": (r) => r.body.includes('data-testid="day"') || r.body.includes("booking"),
      "Response time acceptable": (r) => r.timings.duration < 5000,
    });

    randomSleep();
    return response;
  });
}
