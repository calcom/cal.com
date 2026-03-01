import { describe, expect, it, vi } from "vitest";
import MonthlyDigestEmail from "./monthly-digest-email";

class TestMonthlyDigestEmail extends MonthlyDigestEmail {
  public async getPayload() {
    return await this.getNodeMailerPayload();
  }
}

vi.mock("../src/renderEmail", () => ({
  default: vi.fn(() => Promise.resolve("<html>monthly-digest</html>")),
}));

vi.mock("@calcom/lib/constants", () => ({
  APP_NAME: "Cal.com",
  EMAIL_FROM_NAME: "Cal.com",
}));

vi.mock("./_base-email", () => ({
  default: class {
    getMailerOptions() {
      return { from: "noreply@cal.com" };
    }
  },
}));

const createEventData = () => ({
  admin: { email: "admin@test.com", name: "Admin" },
  createdUsers: 5,
  createdTeams: 2,
  completedBookings: 100,
  cancelledBookings: 10,
  mostBookedUser: { name: "TopBooker", count: 50 },
  membersWithMostBookings: [{ name: "TopBooker", count: 50 }],
  membersWithLeastBookings: [{ name: "LeastBooker", count: 1 }],
  teamId: 1,
  teamName: "Team A",
  prevDateRange: "Dec 2023",
  currentDateRange: "Jan 2024",
  orgSlug: "my-org",
});

describe("MonthlyDigestEmail", () => {
  it("stores eventData", () => {
    const data = createEventData();
    const email = new TestMonthlyDigestEmail(data);
    expect(email.eventData).toEqual(data);
  });

  describe("getNodeMailerPayload", () => {
    it("sends to admin email", async () => {
      const email = new TestMonthlyDigestEmail(createEventData());
      const payload = await email.getPayload();
      expect(payload.to).toBe("admin@test.com");
    });

    it("uses APP_NAME in subject", async () => {
      const email = new TestMonthlyDigestEmail(createEventData());
      const payload = await email.getPayload();
      expect(payload.subject).toBe("Cal.com: Your monthly digest");
    });

    it("includes html", async () => {
      const email = new TestMonthlyDigestEmail(createEventData());
      const payload = await email.getPayload();
      expect(payload.html).toBe("<html>monthly-digest</html>");
    });

    it("returns empty text", async () => {
      const email = new TestMonthlyDigestEmail(createEventData());
      const payload = await email.getPayload();
      expect(payload.text).toBe("");
    });

    it("uses EMAIL_FROM_NAME for from", async () => {
      const email = new TestMonthlyDigestEmail(createEventData());
      const payload = await email.getPayload();
      expect(payload.from).toBe("Cal.com <noreply@cal.com>");
    });
  });
});
