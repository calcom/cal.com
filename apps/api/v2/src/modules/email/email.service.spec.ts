jest.mock("@calcom/platform-libraries", () => ({
  getTranslation: jest.fn().mockResolvedValue({ t: (key: string) => key }),
}));

jest.mock("@calcom/platform-libraries/emails", () => ({
  sendSignupToOrganizationEmail: jest.fn().mockResolvedValue(undefined),
}));

import { getTranslation } from "@calcom/platform-libraries";
import { sendSignupToOrganizationEmail } from "@calcom/platform-libraries/emails";
import { Test, TestingModule } from "@nestjs/testing";
import { EmailService } from "@/modules/email/email.service";

describe("EmailService", () => {
  let service: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailService],
    }).compile();

    service = module.get<EmailService>(EmailService);
    jest.clearAllMocks();
  });

  describe("sendSignupToOrganizationEmail", () => {
    it("should send signup email with correct parameters", async () => {
      await service.sendSignupToOrganizationEmail({
        usernameOrEmail: "user@test.com",
        orgName: "Test Org",
        orgId: 1,
        locale: "en",
        inviterName: "Admin",
      });

      expect(getTranslation).toHaveBeenCalledWith("en", "common");
      expect(sendSignupToOrganizationEmail).toHaveBeenCalledWith({
        usernameOrEmail: "user@test.com",
        team: { name: "Test Org", parent: null },
        inviterName: "Admin",
        isOrg: true,
        teamId: 1,
        translation: expect.anything(),
      });
    });

    it("should default to 'en' locale when locale is null", async () => {
      await service.sendSignupToOrganizationEmail({
        usernameOrEmail: "user@test.com",
        orgName: "Test Org",
        orgId: 1,
        locale: null,
        inviterName: "Admin",
      });

      expect(getTranslation).toHaveBeenCalledWith("en", "common");
    });

    it("should use provided locale when not null", async () => {
      await service.sendSignupToOrganizationEmail({
        usernameOrEmail: "user@test.com",
        orgName: "Test Org",
        orgId: 1,
        locale: "fr",
        inviterName: "Admin",
      });

      expect(getTranslation).toHaveBeenCalledWith("fr", "common");
    });
  });
});
