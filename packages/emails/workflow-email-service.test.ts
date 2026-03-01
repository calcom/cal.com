import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./templates/feedback-email", () => {
  const cls = vi.fn();
  cls.prototype.sendEmail = vi.fn(() => Promise.resolve());
  return { default: cls };
});

vi.mock("./templates/workflow-email", () => {
  const cls = vi.fn();
  cls.prototype.sendEmail = vi.fn(() => Promise.resolve());
  return { default: cls };
});

vi.mock("./templates/monthly-digest-email", () => {
  const cls = vi.fn();
  cls.prototype.sendEmail = vi.fn(() => Promise.resolve());
  return { default: cls };
});

vi.mock("./templates/booking-redirect-notification", () => {
  const cls = vi.fn();
  cls.prototype.sendEmail = vi.fn(() => Promise.resolve());
  return { default: cls };
});

import BookingRedirectEmailNotification from "./templates/booking-redirect-notification";
import FeedbackEmail from "./templates/feedback-email";
import MonthlyDigestEmail from "./templates/monthly-digest-email";
import WorkflowEmail from "./templates/workflow-email";
import {
  sendBookingRedirectNotification,
  sendCustomWorkflowEmail,
  sendFeedbackEmail,
  sendMonthlyDigestEmail,
} from "./workflow-email-service";

describe("workflow-email-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendFeedbackEmail", () => {
    it("creates FeedbackEmail and sends it", async () => {
      const feedback = { username: "user", email: "u@t.com", rating: "5", comment: "Great" };
      await sendFeedbackEmail(feedback);
      expect(FeedbackEmail).toHaveBeenCalledWith(feedback);
      expect(FeedbackEmail.prototype.sendEmail).toHaveBeenCalled();
    });
  });

  describe("sendCustomWorkflowEmail", () => {
    it("creates WorkflowEmail and sends it", async () => {
      const data = { to: "u@t.com", subject: "Test", html: "<p>Hi</p>" };
      await sendCustomWorkflowEmail(data);
      expect(WorkflowEmail).toHaveBeenCalledWith(data);
      expect(WorkflowEmail.prototype.sendEmail).toHaveBeenCalled();
    });
  });

  describe("sendMonthlyDigestEmail", () => {
    it("creates MonthlyDigestEmail and sends it", async () => {
      const data = {
        admin: { email: "admin@t.com", name: "Admin" },
        createdUsers: 5,
        createdTeams: 2,
        completedBookings: 100,
        cancelledBookings: 10,
        mostBookedUser: { name: "Top", count: 50 },
        membersWithMostBookings: [],
        membersWithLeastBookings: [],
        teamId: 1,
        teamName: "Team",
        prevDateRange: "Dec",
        currentDateRange: "Jan",
        orgSlug: "org",
      };
      await sendMonthlyDigestEmail(data);
      expect(MonthlyDigestEmail).toHaveBeenCalledWith(data);
      expect(MonthlyDigestEmail.prototype.sendEmail).toHaveBeenCalled();
    });
  });

  describe("sendBookingRedirectNotification", () => {
    it("creates BookingRedirectEmailNotification and sends it", async () => {
      const data = {
        language: vi.fn(),
        fromEmail: "from@t.com",
        eventOwner: "Owner",
        toEmail: "to@t.com",
        toName: "Recipient",
        dates: "Jan 1",
        action: "add" as const,
      };
      await sendBookingRedirectNotification(data);
      expect(BookingRedirectEmailNotification).toHaveBeenCalledWith(data);
      expect(BookingRedirectEmailNotification.prototype.sendEmail).toHaveBeenCalled();
    });
  });
});
