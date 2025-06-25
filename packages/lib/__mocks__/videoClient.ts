import { vi } from "vitest";

export const createMeeting = vi.fn().mockResolvedValue({
  appName: "daily",
  type: "daily_video",
  success: true,
  uid: "video-uid",
  createdEvent: {
    type: "daily_video",
    id: "video-uid",
    password: "password",
    url: "https://daily.co/meeting",
  },
  originalEvent: {},
});

export const updateMeeting = vi.fn().mockResolvedValue({
  appName: "daily",
  type: "daily_video",
  success: true,
  uid: "video-uid",
  updatedEvent: {
    type: "daily_video",
    id: "video-uid",
    password: "password",
    url: "https://daily.co/meeting",
  },
  originalEvent: {},
});

export const deleteMeeting = vi.fn(); 