import { describe, expect, it, vi } from "vitest";
import FeedbackEmail from "./feedback-email";

class TestFeedbackEmail extends FeedbackEmail {
  public async getPayload() {
    return await this.getNodeMailerPayload();
  }
  public getBody() {
    return this.getTextBody();
  }
}

vi.mock("../src/renderEmail", () => ({
  default: vi.fn(() => Promise.resolve("<html>feedback</html>")),
}));

vi.mock("@calcom/lib/constants", () => ({
  EMAIL_FROM_NAME: "Cal.com",
}));

vi.mock("./_base-email", () => ({
  default: class {
    getMailerOptions() {
      return { from: "noreply@cal.com" };
    }
  },
}));

const createFeedback = () => ({
  username: "testuser",
  email: "user@test.com",
  rating: "5",
  comment: "Great product!",
});

describe("FeedbackEmail", () => {
  it("stores feedback data", () => {
    const feedback = createFeedback();
    const email = new TestFeedbackEmail(feedback);
    expect(email.feedback).toEqual(feedback);
  });

  describe("getNodeMailerPayload", () => {
    it("uses EMAIL_FROM_NAME for from", async () => {
      const email = new TestFeedbackEmail(createFeedback());
      const payload = await email.getPayload();
      expect(payload.from).toBe("Cal.com <noreply@cal.com>");
    });

    it("sends to SEND_FEEDBACK_EMAIL env var", async () => {
      process.env.SEND_FEEDBACK_EMAIL = "feedback@cal.com";
      const email = new TestFeedbackEmail(createFeedback());
      const payload = await email.getPayload();
      expect(payload.to).toBe("feedback@cal.com");
      delete process.env.SEND_FEEDBACK_EMAIL;
    });

    it("has 'User Feedback' as subject", async () => {
      const email = new TestFeedbackEmail(createFeedback());
      const payload = await email.getPayload();
      expect(payload.subject).toBe("User Feedback");
    });

    it("includes html", async () => {
      const email = new TestFeedbackEmail(createFeedback());
      const payload = await email.getPayload();
      expect(payload.html).toBe("<html>feedback</html>");
    });
  });

  describe("getTextBody", () => {
    it("includes user info and feedback", () => {
      const email = new TestFeedbackEmail(createFeedback());
      const body = email.getBody();
      expect(body).toContain("testuser");
      expect(body).toContain("user@test.com");
      expect(body).toContain("5");
      expect(body).toContain("Great product!");
    });
  });
});
