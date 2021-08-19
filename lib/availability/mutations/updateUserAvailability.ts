import request from "@lib/request";

export async function updateUserAvailability({ start, end, buffer }) {
  request.update("/api/availability/day", {
    start: start,
    end: end,
    buffer: buffer,
  });
}
